/**
 * Dev-only, offline, zero-dependency generator for the track-piece toy icons.
 *
 * Reads the GLBs that `PIECE_URLS` in src/scene/track-catalog.ts ships under
 * public/assets/train-kit/, projects their real mesh vertices to a flat
 * axonometric silhouette, and emits a committed 48×48 inline-SVG per piece.
 * Nothing here runs in the browser: no WebGL renderer, no PNG, no dependency.
 *
 *   node scripts/generate-piece-icons.mjs            # refresh the committed file
 *   node scripts/generate-piece-icons.mjs --check    # fail on any diff
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const CATALOG = new URL('../src/scene/track-catalog.ts', import.meta.url);
const PIECES = new URL('../src/core/pieces.ts', import.meta.url);
const OUTPUT = new URL('../src/ui/generated-piece-icons.ts', import.meta.url);

const VIEW = 48;
const PAD = 5;
/** Height folds into the vertical axis so graded pieces read differently. */
const HEIGHT_WEIGHT = 0.8;

/** The PieceType union, read as text so the generator stays dependency-free. */
function pieceTypes(source) {
  const start = source.indexOf('export const PIECE_TYPES');
  if (start < 0) throw new Error('PIECE_TYPES not found in src/core/pieces.ts');
  const open = source.indexOf('[', start);
  const close = source.indexOf(']', open);
  return [...source.slice(open + 1, close).matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

/** The PIECE_URLS table, likewise read as text (it lives in the scene layer). */
function pieceUrls(source) {
  const start = source.indexOf('export const PIECE_URLS');
  if (start < 0) throw new Error('PIECE_URLS not found in src/scene/track-catalog.ts');
  const open = source.indexOf('{', start);
  const close = source.indexOf('\n};', open);
  const entries = new Map();
  const row = /^\s*(?:'([^']+)'|([A-Za-z][\w-]*))\s*:\s*'([^']+)'/;
  for (const line of source.slice(open + 1, close).split('\n')) {
    const match = row.exec(line);
    if (match) entries.set(match[1] ?? match[2], match[3]);
  }
  return entries;
}

const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Column-major 4×4 product, matching the glTF matrix convention. */
function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

/** Node transform (matrix or translation/rotation/scale) as a 4×4. */
function nodeMatrix(node) {
  if (node.matrix) return Array.from(node.matrix);
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

function transform(matrix, [x, y, z]) {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

/** Every mesh vertex in the GLB, in scene/world space. */
function glbPoints(file) {
  const bytes = readFileSync(file);
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2) {
    throw new Error(`not a GLB v2: ${file}`);
  }
  let json;
  let binary;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'JSON') json = JSON.parse(data.toString('utf8'));
    else if (type.startsWith('BIN')) binary = data;
    offset += 8 + length + ((4 - (length % 4)) % 4);
  }
  if (!json || !binary) throw new Error(`GLB missing JSON/BIN chunk: ${file}`);

  const points = [];
  const visit = (index, parent) => {
    const node = json.nodes?.[index];
    if (!node) return;
    const world = multiply(parent, nodeMatrix(node));
    if (node.mesh !== undefined) {
      for (const primitive of json.meshes[node.mesh].primitives) {
        const position = primitive.attributes?.POSITION;
        if (position === undefined) continue;
        const accessor = json.accessors[position];
        if (accessor.componentType !== 5126 || accessor.type !== 'VEC3') {
          throw new Error(`unsupported POSITION accessor in ${file}`);
        }
        const view = json.bufferViews[accessor.bufferView];
        const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        const stride = view.byteStride ?? 12;
        for (let i = 0; i < accessor.count; i += 1) {
          const at = base + i * stride;
          points.push(
            transform(world, [
              binary.readFloatLE(at),
              binary.readFloatLE(at + 4),
              binary.readFloatLE(at + 8),
            ]),
          );
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  const scene = json.scenes?.[json.scene ?? 0];
  for (const root of scene?.nodes ?? []) visit(root, identity());
  if (points.length === 0) throw new Error(`no mesh positions in ${file}`);
  return points;
}

/** Top-down plan (x, z) with height folded in; scales into the 48×48 box. */
function normalize(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  if (spanX === 0 && spanY === 0) return [[VIEW / 2, VIEW / 2]];
  const scale = Math.min((VIEW - 2 * PAD) / (spanX || 1), (VIEW - 2 * PAD) / (spanY || 1));
  const dx = (VIEW - spanX * scale) / 2 - minX * scale;
  const dy = (VIEW - spanY * scale) / 2 - minY * scale;
  return points.map(([x, y]) => [
    Number((x * scale + dx).toFixed(2)),
    Number((y * scale + dy).toFixed(2)),
  ]);
}

/** Andrew's monotone-chain hull: a few real silhouette corners, no hand art. */
function convexHull(points) {
  const unique = [...new Map(points.map((point) => [point.join(','), point])).values()];
  unique.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (unique.length < 3) return unique;
  const cross = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper = [];
  for (let i = unique.length - 1; i >= 0; i -= 1) {
    const point = unique[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Chunky palette-filled silhouette, using the toy-icons.css conventions. */
function silhouette(hull) {
  const points = hull.map(([x, y]) => `${x},${y}`).join(' ');
  if (hull.length < 3) {
    return `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="14" fill="var(--toy-cream)"
              stroke="var(--toy-brown)" stroke-width="3"/>
    </svg>`;
  }
  const centerX = hull.reduce((sum, [x]) => sum + x, 0) / hull.length;
  const centerY = hull.reduce((sum, [, y]) => sum + y, 0) / hull.length;
  const inner = hull
    .map(([x, y]) => [
      Number((centerX + (x - centerX) * 0.6).toFixed(2)),
      Number((centerY + (y - centerY) * 0.6).toFixed(2)),
    ])
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
  return `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <polygon points="${points}" fill="var(--toy-cream)"
               stroke="var(--toy-brown)" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="${inner}" fill="var(--toy-steel)" opacity=".55"/>
    </svg>`;
}

const keyFor = (kind) => (/^[A-Za-z][A-Za-z0-9]*$/.test(kind) ? kind : `'${kind}'`);

function generate() {
  const kinds = pieceTypes(readFileSync(PIECES, 'utf8'));
  const urls = pieceUrls(readFileSync(CATALOG, 'utf8'));
  const entries = kinds.map((kind) => {
    const url = urls.get(kind);
    if (!url) throw new Error(`no PIECE_URLS entry for ${kind}`);
    const vertices = glbPoints(new URL('./public' + url, ROOT));
    const hull = convexHull(normalize(vertices.map(([x, y, z]) => [x, z - y * HEIGHT_WEIGHT])));
    return `  ${keyFor(kind)}: \`${silhouette(hull)}\`,\n`;
  });
  const header = `/**
 * Generated by scripts/generate-piece-icons.mjs from the shipped GLB geometry.
 * Do not edit by hand — rerun \`node scripts/generate-piece-icons.mjs\` to refresh.
 * One static 48×48 silhouette per PieceType; no runtime WebGL renderer.
 */
import type { PieceType } from '../core/pieces';

export const PIECE_ICONS: Record<PieceType, string> = {
`;
  return { content: header + entries.join('') + '};\n', count: kinds.length };
}

const { content, count } = generate();
if (process.argv.includes('--check')) {
  const current = (() => {
    try {
      return readFileSync(OUTPUT, 'utf8');
    } catch {
      return '';
    }
  })();
  if (current === content) {
    console.log(`piece icons up to date: ${count} PieceType silhouettes (no diff)`);
  } else {
    console.error(
      'src/ui/generated-piece-icons.ts is out of date; run: node scripts/generate-piece-icons.mjs',
    );
    process.exitCode = 1;
  }
} else {
  writeFileSync(OUTPUT, content);
  console.log(`wrote src/ui/generated-piece-icons.ts: ${count} PieceType silhouettes`);
}
