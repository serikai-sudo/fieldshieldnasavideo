"""
One voice-over line with the free Microsoft neural voice (edge-tts), plus every word's onset.

    python3 audio/tts_line.py --voice en-US-AvaMultilingualNeural --rate=+0% --pitch=+0Hz --volume=+0% --text "..." --out x.mp3

Writes the mp3 and, beside it, <out>.words.json: [{"word": "water", "start": 0.71, "end": 1.02}, ...] in seconds from
the start of the mp3 (WordBoundary offsets are in 100 ns ticks). HTTPS_PROXY is used when set.
"""
import argparse
import asyncio
import json
import os

import edge_tts


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", required=True)
    parser.add_argument("--rate", default="+0%")
    parser.add_argument("--pitch", default="+0Hz")
    parser.add_argument("--volume", default="+0%")
    parser.add_argument("--text", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    communicate = edge_tts.Communicate(
        args.text, args.voice, rate=args.rate, pitch=args.pitch, volume=args.volume, boundary="WordBoundary", proxy=proxy
    )
    words = []
    with open(args.out, "wb") as media:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                media.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 10_000_000
                words.append({"word": chunk["text"], "start": round(start, 3), "end": round(start + chunk["duration"] / 10_000_000, 3)})
    with open(args.out + ".words.json", "w", encoding="utf-8") as handle:
        json.dump(words, handle, ensure_ascii=False, indent=1)


asyncio.run(main())
