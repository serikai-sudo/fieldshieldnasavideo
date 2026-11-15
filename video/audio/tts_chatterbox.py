"""
The voice-over lines with Chatterbox (Resemble AI, MIT), run on the CPU. The timbre comes from audio/voice-prompt.wav
when it exists — a short clip of a SYNTHETIC voice (the earlier Microsoft neural take), so no real person's voice is
copied; without it the model's built-in voice (which reads as male) is used.

    audio/.venv/bin/python audio/tts_chatterbox.py audio/work/chatterbox-lines.json

For each line: several takes (different seeds); each take is force-aligned to its own words (wav2vec2 CTC, torchaudio
forced_align) so every word's onset is known; the take with the best alignment that fits the line's window wins. The
`*…*` phrase of a line — the moment meant to land — is then lifted in the same voice: that span of the chosen take is
pitch-shifted up (rubberband, tempo kept) and made a little louder, and crossfaded back in. Long pauses are shortened.
Writes audio/lines/<NN>.mp3 and <NN>.mp3.words.json ([{word, start, end}] in seconds, words in their on-screen form).
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import torchaudio

ROOT = Path(__file__).resolve().parent.parent
VOICE_PROMPT = ROOT / "audio" / "voice-prompt.wav"
LINES_DIR = ROOT / "audio" / "lines"
TAKES_DIR = ROOT / "audio" / "takes"
SR = 24_000
TAKES = 3
# Chatterbox: how much emotion, how much the text steers it, how varied the sampling is.
EXAGGERATION = 0.5
CFG_WEIGHT = 0.5
TEMPERATURE = 0.8
# The lift of a key phrase, same voice, same tempo: the span is raised until it sits LIFT_ABOVE_ST semitones above the
# line's plain words and LIFT_ABOVE_DB louder than them — measured on the take itself, because the model lets a sentence
# fall at its end, where most key phrases sit, and a fixed shift only brought them level with the rest. Both are
# bounded so the voice never jumps out of itself.
LIFT_ABOVE_ST = 2.0
LIFT_ABOVE_DB = 2.0
LIFT_ST_RANGE = (1.0, 4.5)
LIFT_DB_RANGE = (1.5, 6.0)
LIFT_PAD = 0.03
FADE = 0.025
# Pauses inside a take longer than this are shortened to KEPT_PAUSE.
LONG_PAUSE = 0.30
KEPT_PAUSE = 0.18
SILENCE_DB = -42
# build-voiceover may stretch a take by this much; a take that fits without it is preferred.
MAX_STRETCH = 1.085


def log(message: str) -> None:
    print(f"[chatterbox] {message}", flush=True)


# ----------------------------------------------------------------------------------------------------------- text

def spoken_form(text: str, say: dict[str, str]) -> str:
    """The line as the voice is to read it: the SAY substitutions, longest written token first."""
    for written in sorted(say, key=len, reverse=True):
        text = text.replace(written, say[written])
    return text


def tokens_of(text: str) -> list[str]:
    """Words of a spoken sentence, as the aligner's vocabulary spells them (upper-case letters and apostrophes)."""
    words = []
    for raw in re.split(r"\s+", text.strip()):
        clean = re.sub(r"[^A-Za-z']", "", raw.replace("’", "'"))
        if clean:
            words.append(clean.upper())
    return words


def written_words(text: str, say: dict[str, str]) -> list[tuple[str, int]]:
    """
    The on-screen words with how many spoken tokens each one takes: "2012" is one written word said as two tokens
    ("twenty twelve"), "55 days" one written word of two tokens, and so on. Returned in order, aligned to tokens_of().
    """
    out: list[tuple[str, int]] = []
    rest = text.strip()
    pattern = sorted(say, key=len, reverse=True)
    while rest:
        rest = rest.lstrip()
        if not rest:
            break
        hit = next((w for w in pattern if rest.startswith(w) and (len(rest) == len(w) or not rest[len(w)].isalnum())), None)
        if hit is not None:
            out.append((hit, len(tokens_of(say[hit]))))
            rest = rest[len(hit):]
            continue
        match = re.match(r"\S+", rest)
        word = match.group(0)
        rest = rest[len(word):]
        if tokens_of(word):
            out.append((word, 1))
    return out


# ------------------------------------------------------------------------------------------------------ alignment

class Aligner:
    """wav2vec2-base-960h CTC: emission log-probabilities for the forced alignment of a known transcript."""

    def __init__(self) -> None:
        from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

        name = "facebook/wav2vec2-base-960h"
        self.processor = Wav2Vec2Processor.from_pretrained(name)
        self.model = Wav2Vec2ForCTC.from_pretrained(name).eval()
        self.vocab = {k: v for k, v in self.processor.tokenizer.get_vocab().items()}

    def align(self, wav: np.ndarray, sr: int, tokens: list[str]) -> tuple[list[tuple[float, float]], float]:
        """Each token's (start, end) in seconds and the mean frame score; raises when a token cannot be spelled."""
        audio = torch.from_numpy(wav).float()
        if sr != 16_000:
            audio = torchaudio.functional.resample(audio, sr, 16_000)
        inputs = self.processor(audio.numpy(), sampling_rate=16_000, return_tensors="pt")
        with torch.inference_mode():
            logits = self.model(inputs.input_values).logits[0]
        emission = torch.log_softmax(logits, dim=-1).unsqueeze(0)
        transcript = "|".join(tokens)
        ids = [self.vocab[c] for c in transcript]
        targets = torch.tensor([ids], dtype=torch.int32)
        path, scores = torchaudio.functional.forced_align(emission, targets, blank=0)
        spans = torchaudio.functional.merge_tokens(path[0], scores[0].exp())
        frame_seconds = audio.shape[0] / 16_000 / emission.shape[1]
        # Group character spans into words at the "|" separators.
        words: list[tuple[float, float]] = []
        current: list = []
        word_scores: list[float] = []
        for span in spans:
            char = transcript[len(word_scores)]
            word_scores.append(float(span.score))
            if char == "|":
                if current:
                    words.append((current[0].start * frame_seconds, current[-1].end * frame_seconds))
                current = []
            else:
                current.append(span)
        if current:
            words.append((current[0].start * frame_seconds, current[-1].end * frame_seconds))
        if len(words) != len(tokens):
            raise RuntimeError(f"aligned {len(words)} words for {len(tokens)} tokens")
        return words, float(np.mean(word_scores))


# ---------------------------------------------------------------------------------------------------------- audio

def db_to_gain(db: float) -> float:
    return 10 ** (db / 20)


def shorten_pauses(wav: np.ndarray, sr: int, words: list[tuple[float, float]]) -> tuple[np.ndarray, list[tuple[float, float]]]:
    """Cuts every gap between words longer than LONG_PAUSE down to KEPT_PAUSE, keeping the words' timings consistent."""
    pieces: list[np.ndarray] = []
    out_words: list[tuple[float, float]] = []
    cursor = 0.0
    shift = 0.0
    for i, (start, end) in enumerate(words):
        if i > 0:
            gap = start - words[i - 1][1]
            if gap > LONG_PAUSE:
                cut = gap - KEPT_PAUSE
                keep_to = words[i - 1][1] + KEPT_PAUSE / 2
                resume = start - KEPT_PAUSE / 2
                a = wav[int(cursor * sr) : int(keep_to * sr)]
                pieces.append(a)
                # A short crossfade over the cut so nothing clicks.
                n = int(FADE * sr)
                head = wav[int(resume * sr) : int(resume * sr) + n] if n else np.zeros(0)
                if len(pieces[-1]) >= n and len(head) == n:
                    ramp = np.linspace(0, 1, n)
                    pieces[-1] = np.concatenate([pieces[-1][:-n], pieces[-1][-n:] * (1 - ramp) + head * ramp])
                    cursor = resume + FADE
                else:
                    cursor = resume
                shift += cut
        out_words.append((start - shift, end - shift))
    pieces.append(wav[int(cursor * sr) :])
    return np.concatenate(pieces), out_words


def median_f0(wav: np.ndarray, sr: int) -> float:
    import librosa

    f0, _, _ = librosa.pyin(wav.astype(np.float32), fmin=100, fmax=450, sr=sr)
    value = float(np.nanmedian(f0))
    return value if np.isfinite(value) else 200.0


def rms_db(wav: np.ndarray) -> float:
    return float(20 * np.log10(np.sqrt(np.mean(np.square(wav))) + 1e-9))


def lift(wav: np.ndarray, sr: int, start: float, end: float) -> tuple[np.ndarray, float, float]:
    """
    The span [start, end] pitched up (tempo kept) and made louder, crossfaded back into the take, by as much as it takes
    to put it LIFT_ABOVE_ST / LIFT_ABOVE_DB above the words before it (within LIFT_ST_RANGE / LIFT_DB_RANGE). Returns
    the take and the semitones and dB applied.
    """
    a = max(0, int((start - LIFT_PAD) * sr))
    b = min(len(wav), int((end + LIFT_PAD) * sr))
    segment = wav[a:b]
    plain = wav[: max(sr // 4, a - int(0.05 * sr))]
    semitones = float(np.clip(12 * np.log2(median_f0(plain, sr) / median_f0(segment, sr)) + LIFT_ABOVE_ST, *LIFT_ST_RANGE))
    gain_db = float(np.clip(rms_db(plain) - rms_db(segment) + LIFT_ABOVE_DB + 1.0, *LIFT_DB_RANGE))  # +1: rubberband's loss
    pitch = 2 ** (semitones / 12)
    tmp_in = TAKES_DIR / "lift-in.wav"
    tmp_out = TAKES_DIR / "lift-out.wav"
    sf.write(tmp_in, segment, sr, subtype="FLOAT")
    subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(tmp_in), "-af", f"rubberband=pitch={pitch:.5f}:tempo=1:pitchq=quality:formant=preserved", str(tmp_out)],
        check=True,
    )
    shifted, _ = sf.read(tmp_out, dtype="float32")
    if shifted.ndim > 1:
        shifted = shifted.mean(axis=1)
    # rubberband may return a few samples more or fewer: fit it to the span.
    if len(shifted) > len(segment):
        shifted = shifted[: len(segment)]
    elif len(shifted) < len(segment):
        shifted = np.pad(shifted, (0, len(segment) - len(shifted)))
    shifted = shifted * db_to_gain(gain_db)
    n = min(int(FADE * sr), len(segment) // 2)
    ramp = np.linspace(0, 1, n)
    mixed = shifted.copy()
    mixed[:n] = segment[:n] * (1 - ramp) + shifted[:n] * ramp
    mixed[-n:] = shifted[-n:] * (1 - ramp) + segment[-n:] * ramp
    out = wav.copy()
    out[a:b] = mixed
    return out, semitones, gain_db


def trimmed_seconds(wav: np.ndarray, sr: int) -> float:
    """Seconds of the take between its first and last sound above SILENCE_DB (what build-voiceover will keep)."""
    level = 20 * np.log10(np.maximum(np.abs(wav), 1e-9))
    loud = np.where(level > SILENCE_DB)[0]
    if len(loud) == 0:
        return len(wav) / sr
    return float((loud[-1] - loud[0]) / sr)


# ----------------------------------------------------------------------------------------------------------- main

def main() -> None:
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    say: dict[str, str] = spec["say"]
    only: list[int] = spec.get("only") or []
    LINES_DIR.mkdir(parents=True, exist_ok=True)
    TAKES_DIR.mkdir(parents=True, exist_ok=True)

    torch.set_num_threads(max(1, os.cpu_count() or 1))
    reuse = os.environ.get("TTS_REUSE") == "1"
    t0 = time.time()
    tts = None
    prompt = str(VOICE_PROMPT) if VOICE_PROMPT.exists() else None
    if not reuse:
        from chatterbox.tts import ChatterboxTTS

        tts = ChatterboxTTS.from_pretrained(device="cpu")
        if prompt is not None:
            tts.prepare_conditionals(prompt, exaggeration=EXAGGERATION)
    aligner = Aligner()
    log(f"models loaded in {time.time() - t0:.0f} s; voice: {'audio/voice-prompt.wav' if prompt else 'built-in'}{' · reusing saved takes' if reuse else ''}")

    for line in spec["lines"]:
        if only and line["index"] not in only:
            continue
        text: str = line["text"]
        spoken = spoken_form(text, say)
        tokens = tokens_of(spoken)
        written = written_words(text, say)
        if sum(n for _, n in written) != len(tokens):
            raise RuntimeError(f"line {line['id']}: {len(tokens)} spoken tokens vs written words {written}")
        emphasis = [spoken_form(s["text"], say) for s in line["segments"] if s["emphasis"]]

        candidates = []
        for seed in range(1, TAKES + 1):
            started = time.time()
            take_file = TAKES_DIR / f"{line['id']}-{seed}.wav"
            if reuse and take_file.exists():
                # TTS_REUSE=1: the saved takes again (same words, new lift or windows) — no generation.
                wav, sr = sf.read(take_file, dtype="float32")
            else:
                torch.manual_seed(seed)
                with torch.inference_mode():
                    audio = tts.generate(spoken, audio_prompt_path=prompt, exaggeration=EXAGGERATION, cfg_weight=CFG_WEIGHT, temperature=TEMPERATURE)
                wav = audio.squeeze(0).cpu().numpy().astype(np.float32)
                sr = tts.sr
            try:
                spans, score = aligner.align(wav, sr, tokens)
            except Exception as error:  # noqa: BLE001 — a take the aligner cannot follow is a bad take
                log(f"line {line['id']} seed {seed}: alignment failed ({error}); skipped")
                continue
            wav, spans = shorten_pauses(wav, sr, spans)
            seconds = trimmed_seconds(wav, sr)
            fits = seconds <= line["maxSeconds"]
            sf.write(take_file, wav, sr, subtype="FLOAT")
            candidates.append({"seed": seed, "wav": wav, "sr": sr, "spans": spans, "score": score, "seconds": seconds, "fits": fits})
            log(f"line {line['id']} seed {seed}: {seconds:.2f} s (max {line['maxSeconds']:.2f}) score {score:.2f} {'fits' if fits else 'LONG'} · {time.time() - started:.0f} s")
        if not candidates:
            raise RuntimeError(f"line {line['id']}: no usable take")
        # The best-aligned take that needs no time-stretch; else the best that fits with one; else the shortest.
        plain = [c for c in candidates if c["seconds"] <= line["maxSeconds"] / MAX_STRETCH]
        fitting = [c for c in candidates if c["fits"]]
        pool = plain or fitting
        best = max(pool, key=lambda c: c["score"]) if pool else min(candidates, key=lambda c: c["seconds"])

        wav, sr, spans = best["wav"], best["sr"], best["spans"]
        # Spoken-token index → written word, so words.json carries the on-screen spelling.
        words_out = []
        cursor = 0
        for word, count in written:
            start = spans[cursor][0]
            end = spans[cursor + count - 1][1]
            words_out.append({"word": word, "start": round(start, 3), "end": round(end, 3)})
            cursor += count
        # The lift: each emphasised phrase found as a run of spoken tokens.
        for phrase in emphasis:
            want = tokens_of(phrase)
            for i in range(len(tokens) - len(want) + 1):
                if tokens[i : i + len(want)] == want:
                    wav, semitones, gain_db = lift(wav, sr, spans[i][0], spans[i + len(want) - 1][1])
                    log(f"line {line['id']}: lifted “{phrase}” {spans[i][0]:.2f}–{spans[i + len(want) - 1][1]:.2f} s by +{semitones:.1f} st, +{gain_db:.1f} dB")
                    break
            else:
                log(f"line {line['id']}: emphasis “{phrase}” not found in the tokens")

        out = LINES_DIR / f"{line['id']}.mp3"
        tmp = TAKES_DIR / f"{line['id']}-chosen.wav"
        sf.write(tmp, wav, sr, subtype="FLOAT")
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(tmp), "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", str(out)], check=True)
        (LINES_DIR / f"{line['id']}.mp3.words.json").write_text(json.dumps(words_out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        log(f"line {line['id']}: seed {best['seed']} → {out.name} ({best['seconds']:.2f} s, score {best['score']:.2f})  {text}")
    log("done")


if __name__ == "__main__":
    main()
