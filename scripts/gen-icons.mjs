/**
 * Generates placeholder PWA icons (solid toy-amber squares with a darker
 * "track bed" band). Deterministic, zero-dependency PNG writer.
 * Replace with real Tiny Tracks art before first public release.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const table = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(width, height, top, bottom) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  const rows = [];
  const bandStart = Math.floor(height * 0.72);
  for (let y = 0; y < height; y++) {
    const [r, g, b] = y >= bandStart ? bottom : top;
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
      row[1 + x * 3] = r;
      row[1 + x * 3 + 1] = g;
      row[1 + x * 3 + 2] = b;
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const AMBER = [255, 176, 0];
const TRACK = [109, 76, 41];

for (const size of [192, 512]) {
  const name = `pwa-${size}x${size}.png`;
  writeFileSync(new URL(`../public/${name}`, import.meta.url), png(size, size, AMBER, TRACK));
  console.log(`generated public/${name}`);
}
