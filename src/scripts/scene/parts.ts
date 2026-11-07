import {
  CurvePath,
  LineCurve3,
  QuadraticBezierCurve3,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface Part {
  name: string;
  geometry: BufferGeometry;
  radius: number;
}

const TUBE = 0.16;
const RADIAL = 18;

type P = [number, number];

function roundedPath(points: P[], r: number, closed: boolean) {
  const v = points.map(([x, y]) => new Vector3(x, y, 0));
  const path = new CurvePath<Vector3>();
  const n = v.length;
  const corner = (i: number) => {
    const prev = v[(i - 1 + n) % n];
    const curr = v[i];
    const next = v[(i + 1) % n];
    const inDir = curr.clone().sub(prev);
    const outDir = next.clone().sub(curr);
    const rr = Math.min(r, inDir.length() / 2, outDir.length() / 2);
    return {
      a: curr.clone().sub(inDir.normalize().multiplyScalar(rr)),
      c: curr,
      b: curr.clone().add(outDir.normalize().multiplyScalar(rr)),
    };
  };
  if (closed) {
    const corners = v.map((_, i) => corner(i));
    corners.forEach((cn, i) => {
      const next = corners[(i + 1) % n];
      path.add(new QuadraticBezierCurve3(cn.a, cn.c, cn.b));
      path.add(new LineCurve3(cn.b, next.a));
    });
    return path;
  }
  let cursor = v[0];
  for (let i = 1; i < n - 1; i++) {
    const cn = corner(i);
    path.add(new LineCurve3(cursor, cn.a));
    path.add(new QuadraticBezierCurve3(cn.a, cn.c, cn.b));
    cursor = cn.b;
  }
  path.add(new LineCurve3(cursor, v[n - 1]));
  return path;
}

function tube(points: P[], r: number, closed = false, caps: number = TUBE) {
  const path = roundedPath(points, r, closed);
  const segments = Math.max(48, Math.round(path.getLength() * 40));
  const body = new TubeGeometry(path, segments, TUBE, RADIAL, closed);
  const parts: BufferGeometry[] = [body];
  if (!closed) {
    const [sx, sy] = points[0];
    const [ex, ey] = points[points.length - 1];
    parts.push(new SphereGeometry(caps, 20, 14).translate(sx, sy, 0), new SphereGeometry(caps, 20, 14).translate(ex, ey, 0));
  }
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
  parts.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}

export function makeParts(): Part[] {
  const ring = new TorusGeometry(0.42, TUBE, RADIAL, 56).toNonIndexed();
  ring.computeBoundingSphere();
  return [
    { name: 'o', geometry: tube([[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]], 0.32, true), radius: 1.18 },
    { name: 's', geometry: tube([[-0.8, -0.8], [0.8, -0.8], [0.8, 0], [-0.8, 0], [-0.8, 0.8], [0.8, 0.8]], 0.3), radius: 1.18 },
    { name: 'corner', geometry: tube([[-0.65, 0.85], [-0.65, -0.65], [0.85, -0.65]], 0.42), radius: 1.05 },
    { name: 'u', geometry: tube([[-0.6, 0.8], [-0.6, -0.6], [0.6, -0.6], [0.6, 0.8]], 0.42), radius: 1.05 },
    { name: 'segment', geometry: tube([[-0.9, 0], [0.9, 0]], 0, false, 0.24), radius: 1.05 },
    { name: 'node', geometry: ring, radius: 0.7 },
  ];
}

export const PART_MIX = {
  desktop: ['o', 's', 'corner', 'segment', 'u', 'node', 's', 'o', 'corner', 'segment'],
  mobile: ['o', 's', 'corner', 'segment', 'node', 's', 'u', 'o'],
};
