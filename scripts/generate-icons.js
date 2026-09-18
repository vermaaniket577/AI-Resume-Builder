import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#4338ca" />
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>
  <!-- Background with rounded squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  
  <!-- Document paper body -->
  <g transform="translate(106, 96)">
    <rect x="0" y="0" width="300" height="340" rx="28" fill="#ffffff" filter="drop-shadow(0 16px 32px rgba(0,0,0,0.18))" />
    
    <!-- Header avatar placeholder -->
    <rect x="36" y="36" width="60" height="60" rx="16" fill="#e0e7ff" />
    
    <!-- Header name lines -->
    <rect x="112" y="44" width="140" height="18" rx="9" fill="#4338ca" />
    <rect x="112" y="72" width="90" height="12" rx="6" fill="#94a3b8" />
    
    <!-- Divider -->
    <line x1="36" y1="120" x2="264" y2="120" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" />
    
    <!-- Body text simulated rows -->
    <rect x="36" y="144" width="110" height="14" rx="7" fill="#6366f1" />
    <rect x="36" y="172" width="228" height="10" rx="5" fill="#cbd5e1" />
    <rect x="36" y="194" width="190" height="10" rx="5" fill="#e2e8f0" />
    
    <rect x="36" y="226" width="90" height="14" rx="7" fill="#6366f1" />
    <rect x="36" y="254" width="228" height="10" rx="5" fill="#cbd5e1" />
    <rect x="36" y="276" width="160" height="10" rx="5" fill="#e2e8f0" />
  </g>

  <!-- AI Sparkle Badge -->
  <g transform="translate(320, 310)">
    <circle cx="60" cy="60" r="54" fill="url(#sparkGrad)" filter="drop-shadow(0 8px 16px rgba(245,158,11,0.4))" />
    <!-- 4-point star -->
    <path d="M 60 26 C 60 48 42 60 26 60 C 42 60 60 72 60 94 C 60 72 78 60 94 60 C 78 60 60 48 60 26 Z" fill="#ffffff" />
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');

// Pure Node.js function to create valid uncompressed/deflated RGBA PNG
function createPng(width, height, drawPixel) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // deflate
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data: filter byte (0 = None) + 4 bytes per pixel per scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixel = drawPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = pixel.r;
      rawData[pxOffset + 1] = pixel.g;
      rawData[pxOffset + 2] = pixel.b;
      rawData[pxOffset + 3] = pixel.a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcTarget = chunk.subarray(4, 8 + length);
  const crc = calculateCrc32(crcTarget);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Standard PNG CRC32 table
let crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  return crcTable;
}

function calculateCrc32(buf) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Brand icon drawer function
function drawBrandIcon(x, y, width, height, isMaskable = false) {
  const u = x / width;
  const v = y / height;

  // Maskable icons should fill the whole square nicely with safe margins
  const cornerRadius = isMaskable ? 0 : 0.22;
  const margin = isMaskable ? 0 : 0.02;

  // Check rounded corner for non-maskable
  if (!isMaskable) {
    const rx = Math.min(Math.abs(u - cornerRadius), Math.abs(u - (1 - cornerRadius)));
    const ry = Math.min(Math.abs(v - cornerRadius), Math.abs(v - (1 - cornerRadius)));
    if ((u < cornerRadius || u > 1 - cornerRadius) && (v < cornerRadius || v > 1 - cornerRadius)) {
      const dx = Math.min(Math.abs(u - cornerRadius), Math.abs(1 - cornerRadius - u));
      const dy = Math.min(Math.abs(v - cornerRadius), Math.abs(1 - cornerRadius - v));
      // distance from corner center
      const cx = u < cornerRadius ? cornerRadius : 1 - cornerRadius;
      const cy = v < cornerRadius ? cornerRadius : 1 - cornerRadius;
      const dist = Math.hypot(u - cx, v - cy);
      if (dist > cornerRadius) {
        return { r: 0, g: 0, b: 0, a: 0 };
      }
    }
  }

  // Gradient background: indigo #6366f1 to #4338ca
  const t = (u + v) / 2;
  let bgR = Math.round(99 * (1 - t) + 67 * t);
  let bgG = Math.round(102 * (1 - t) + 56 * t);
  let bgB = Math.round(241 * (1 - t) + 202 * t);

  // Document paper rectangle: centered
  const paperLeft = 0.25;
  const paperRight = 0.75;
  const paperTop = 0.20;
  const paperBottom = 0.80;

  if (u >= paperLeft && u <= paperRight && v >= paperTop && v <= paperBottom) {
    // Inside paper
    const pu = (u - paperLeft) / (paperRight - paperLeft);
    const pv = (v - paperTop) / (paperBottom - paperTop);

    // Profile photo placeholder
    if (pu >= 0.12 && pu <= 0.35 && pv >= 0.10 && pv <= 0.28) {
      return { r: 224, g: 231, b: 255, a: 255 }; // Light indigo
    }

    // Name bar
    if (pu >= 0.42 && pu <= 0.88 && pv >= 0.12 && pv <= 0.18) {
      return { r: 67, g: 56, b: 202, a: 255 }; // Indigo 700
    }

    // Subtitle bar
    if (pu >= 0.42 && pu <= 0.72 && pv >= 0.22 && pv <= 0.26) {
      return { r: 148, g: 163, b: 184, a: 255 }; // Slate 400
    }

    // Section 1 header
    if (pu >= 0.12 && pu <= 0.50 && pv >= 0.36 && pv <= 0.41) {
      return { r: 99, g: 102, b: 241, a: 255 };
    }
    // Section 1 line 1
    if (pu >= 0.12 && pu <= 0.88 && pv >= 0.45 && pv <= 0.48) {
      return { r: 203, g: 213, b: 225, a: 255 };
    }
    // Section 1 line 2
    if (pu >= 0.12 && pu <= 0.75 && pv >= 0.52 && pv <= 0.55) {
      return { r: 226, g: 232, b: 240, a: 255 };
    }

    // Section 2 header
    if (pu >= 0.12 && pu <= 0.45 && pv >= 0.63 && pv <= 0.68) {
      return { r: 99, g: 102, b: 241, a: 255 };
    }
    // Section 2 line 1
    if (pu >= 0.12 && pu <= 0.88 && pv >= 0.72 && pv <= 0.75) {
      return { r: 203, g: 213, b: 225, a: 255 };
    }
    // Section 2 line 2
    if (pu >= 0.12 && pu <= 0.65 && pv >= 0.79 && pv <= 0.82) {
      return { r: 226, g: 232, b: 240, a: 255 };
    }

    return { r: 255, g: 255, b: 255, a: 255 };
  }

  // AI Sparkle badge in lower right (center ~ 0.72, 0.72)
  const scx = 0.74;
  const scy = 0.74;
  const sdist = Math.hypot(u - scx, v - scy);
  if (sdist < 0.14) {
    // Sparkle star inside badge
    const dx = Math.abs(u - scx) / 0.14;
    const dy = Math.abs(v - scy) / 0.14;
    const starShape = Math.pow(dx, 0.6) + Math.pow(dy, 0.6);
    if (starShape < 0.8) {
      return { r: 255, g: 255, b: 255, a: 255 };
    }
    return { r: 245, g: 158, b: 11, a: 255 }; // Amber badge
  }

  return { r: bgR, g: bgG, b: bgB, a: 255 };
}

// Generate PNG assets
console.log('Generating PWA icons...');
const png192 = createPng(192, 192, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

const png512 = createPng(512, 512, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

const pngMaskable512 = createPng(512, 512, (x, y, w, h) => drawBrandIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable512);

const appleIcon = createPng(180, 180, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// Simple favicon
const favicon = createPng(32, 32, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon);

console.log('PWA icons created successfully in /public!');
