#!/usr/bin/env node
/**
 * Generates Uvi's original brand raster assets with zero dependencies:
 *   images/og-image.png       (1200x630 social card)
 *   images/apple-touch-icon.png (180x180 home-screen icon)
 *
 * Pure-Node PNG encoder (RGBA, filter 0) + zlib. Run:  node tools/gen-og.js
 * All artwork is drawn here from scratch — no third-party images.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---- tiny PNG encoder ---- */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---- drawing helpers ---- */
const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v | 0;
const lerp = (a, b, t) => a + (b - a) * t;
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}
// deterministic pseudo-random for stars
function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const NIGHT = [15, 28, 26];
const NIGHT2 = [18, 36, 31];
const OCHRE = [224, 116, 58];
const OCHRE_SOFT = [240, 160, 106];
const GUM_BACK = [47, 107, 87];
const GUM_MID = [33, 73, 61];
const GUM_FRONT = [22, 51, 43];

function scene(width, height, opts) {
  const buf = Buffer.alloc(width * height * 4);
  const rng = makeRng(20260918);
  // pre-generate stars
  const stars = [];
  const starCount = Math.round(width * height / 5200);
  for (let i = 0; i < starCount; i++) {
    stars.push({ x: (rng() * width) | 0, y: (rng() * height * 0.55) | 0, b: 0.4 + rng() * 0.6 });
  }
  const starSet = new Map();
  stars.forEach((s) => starSet.set(s.y * width + s.x, s.b));

  const sunX = opts.sunX, sunY = opts.sunY, sunR = opts.sunR;
  const scale = width / 1200;
  const ridgeBack = (x) => opts.mtnBaseBack * scale + 45 * scale * Math.sin(x / (200 * scale));
  const ridgeMid = (x) => opts.mtnBaseMid * scale + 55 * scale * Math.sin(x / (140 * scale) + 2);
  const ridgeFront = (x) => opts.mtnBaseFront * scale + 35 * scale * Math.sin(x / (90 * scale) + 4);

  for (let y = 0; y < height; y++) {
    const tGrad = y / height;
    const base = mix(NIGHT2, NIGHT, tGrad);
    for (let x = 0; x < width; x++) {
      let col = [base[0], base[1], base[2]];

      // sun glow (radial, additive)
      const dxg = x - sunX, dyg = y - sunY;
      const dist = Math.sqrt(dxg * dxg + dyg * dyg);
      const glow = Math.max(0, 1 - dist / (opts.glowR)) ** 2;
      col = [col[0] + OCHRE[0] * glow * 0.5, col[1] + OCHRE[1] * glow * 0.4, col[2] + OCHRE[2] * glow * 0.35];

      // stars
      const sb = starSet.get(y * width + x);
      if (sb && dist > sunR + 10) col = mix(col, [235, 244, 241], sb);

      // sun disc
      if (dist <= sunR) {
        const t = (y - (sunY - sunR)) / (2 * sunR);
        col = mix(OCHRE_SOFT, OCHRE, Math.max(0, Math.min(1, t)));
      }

      // mountains (front-most wins)
      if (y >= ridgeFront(x)) col = GUM_FRONT;
      else if (y >= ridgeMid(x)) col = GUM_MID;
      else if (y >= ridgeBack(x)) col = GUM_BACK;

      const i = (y * width + x) * 4;
      buf[i] = clamp(col[0]); buf[i + 1] = clamp(col[1]); buf[i + 2] = clamp(col[2]); buf[i + 3] = 255;
    }
  }
  return buf;
}

const root = path.join(__dirname, '..');
const imgDir = path.join(root, 'images');
fs.mkdirSync(imgDir, { recursive: true });

// OG card 1200x630
const og = scene(1200, 630, {
  sunX: 930, sunY: 170, sunR: 74, glowR: 620,
  mtnBaseBack: 410, mtnBaseMid: 480, mtnBaseFront: 552
});
fs.writeFileSync(path.join(imgDir, 'og-image.png'), encodePNG(1200, 630, og));

// Apple touch icon 180x180 (tighter framing)
const icon = scene(180, 180, {
  sunX: 126, sunY: 58, sunR: 30, glowR: 150,
  mtnBaseBack: 300, mtnBaseMid: 340, mtnBaseFront: 372
});
fs.writeFileSync(path.join(imgDir, 'apple-touch-icon.png'), encodePNG(180, 180, icon));

console.log('Generated images/og-image.png (1200x630) and images/apple-touch-icon.png (180x180).');
