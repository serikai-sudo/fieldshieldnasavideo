/**
 * A flat projection of [lon, lat] rings into an SVG box: equirectangular with the longitude scaled by cos(mid latitude),
 * which is all a silhouette of a 40°-wide strip at 52° N needs. Pure.
 */
import type { Ring } from '../data/belt-outline';

export type GeoBox = { readonly lonMin: number; readonly lonMax: number; readonly latMin: number; readonly latMax: number };

export function boxOf(rings: readonly Ring[]): GeoBox {
  let lonMin = Number.POSITIVE_INFINITY;
  let lonMax = Number.NEGATIVE_INFINITY;
  let latMin = Number.POSITIVE_INFINITY;
  let latMax = Number.NEGATIVE_INFINITY;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      lonMin = Math.min(lonMin, lon);
      lonMax = Math.max(lonMax, lon);
      latMin = Math.min(latMin, lat);
      latMax = Math.max(latMax, lat);
    }
  }
  return { lonMin, lonMax, latMin, latMax };
}

export type Projection = {
  readonly width: number;
  readonly height: number;
  readonly project: (lon: number, lat: number) => readonly [number, number];
};

/** Fits `box` into `width` × `height` (preserving the local aspect) and returns the projector plus the drawn size. */
export function projectionFor(box: GeoBox, width: number, height: number): Projection {
  const midLat = (box.latMin + box.latMax) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const spanX = (box.lonMax - box.lonMin) * kx;
  const spanY = box.latMax - box.latMin;
  const scale = Math.min(width / spanX, height / spanY);
  const drawnW = spanX * scale;
  const drawnH = spanY * scale;
  const offsetX = (width - drawnW) / 2;
  const offsetY = (height - drawnH) / 2;
  return {
    width,
    height,
    project: (lon, lat) => [offsetX + (lon - box.lonMin) * kx * scale, offsetY + (box.latMax - lat) * scale],
  };
}

export function ringPath(ring: Ring, projection: Projection): string {
  return ring
    .map(([lon, lat], index) => {
      const [x, y] = projection.project(lon, lat);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ')
    .concat(' Z');
}
