/** Byte-mode QR, versions 1–3, ECL L. Enough for localchat:username. */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (!a || !b) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsPoly(degree: number): Uint8Array {
  const poly = new Uint8Array(degree + 1);
  poly[0] = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = i; j >= 0; j--) {
      poly[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
  }
  return poly;
}

function rsEncode(data: Uint8Array, ec: number): Uint8Array {
  const gen = rsPoly(ec);
  const out = new Uint8Array(data.length + ec);
  out.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = out[i];
    if (!coef) continue;
    for (let j = 0; j < gen.length; j++) out[i + j] ^= gfMul(gen[j], coef);
  }
  return out.slice(data.length);
}

type Ver = 1 | 2 | 3;

const SPEC: Record<Ver, { size: number; data: number; ec: number; align: number[] }> = {
  1: { size: 21, data: 19, ec: 7, align: [] },
  2: { size: 25, data: 34, ec: 10, align: [18] },
  3: { size: 29, data: 55, ec: 15, align: [22] },
};

function pickVersion(bytes: number): Ver {
  if (bytes + 2 <= 17) return 1;
  if (bytes + 2 <= 32) return 2;
  return 3;
}

function reserved(size: number, x: number, y: number, align: number[]): boolean {
  if (y === 6 || x === 6) return true;
  if (x < 9 && y < 9) return true;
  if (x >= size - 8 && y < 9) return true;
  if (x < 9 && y >= size - 8) return true;
  for (const a of align) {
    if (x >= a - 2 && x <= a + 2 && y >= a - 2 && y <= a + 2) return true;
  }
  return false;
}

export function encodeQr(text: string): boolean[][] {
  const payload = new TextEncoder().encode(text).slice(0, 53);
  const ver = pickVersion(payload.length);
  const spec = SPEC[ver];
  const bits: number[] = [];
  const push = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  push(0b0100, 4);
  push(payload.length, 8);
  for (const b of payload) push(b, 8);
  const cap = spec.data * 8;
  const remain = cap - bits.length;
  if (remain > 0) push(0, Math.min(4, remain));
  while (bits.length % 8) bits.push(0);
  const bytes = new Uint8Array(spec.data);
  for (let i = 0; i < bytes.length && i * 8 < bits.length; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | (bits[i * 8 + j] ?? 0);
    bytes[i] = v;
  }
  const pads = [0xec, 0x11];
  let p = 0;
  for (let i = Math.ceil(bits.length / 8); i < bytes.length; i++) bytes[i] = pads[p++ % 2];
  const ec = rsEncode(bytes, spec.ec);
  const all = new Uint8Array(bytes.length + ec.length);
  all.set(bytes);
  all.set(ec, bytes.length);

  const size = spec.size;
  const mod = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const used = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const paintFinder = (x: number, y: number) => {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const on = dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
        mod[y + dy][x + dx] = on;
        used[y + dy][x + dx] = true;
      }
    }
    for (let i = -1; i < 8; i++) {
      for (const [xx, yy] of [
        [x + i, y - 1],
        [x + i, y + 7],
        [x - 1, y + i],
        [x + 7, y + i],
      ]) {
        if (yy >= 0 && xx >= 0 && yy < size && xx < size) used[yy][xx] = true;
      }
    }
  };
  paintFinder(0, 0);
  paintFinder(size - 7, 0);
  paintFinder(0, size - 7);

  for (let i = 8; i < size - 8; i++) {
    mod[6][i] = i % 2 === 0;
    mod[i][6] = i % 2 === 0;
    used[6][i] = true;
    used[i][6] = true;
  }

  for (const a of spec.align) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        mod[a + dy][a + dx] = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
        used[a + dy][a + dx] = true;
      }
    }
  }

  for (let i = 0; i < 9; i++) {
    if (i < size) {
      used[i][8] = true;
      used[8][i] = true;
      used[size - 1 - i][8] = true;
      used[8][size - 1 - i] = true;
    }
  }
  mod[size - 8][8] = true;
  used[size - 8][8] = true;

  let bit = 0;
  const totalBits = all.length * 8;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let rowPass = 0; rowPass < size; rowPass++) {
      const upward = ((size - 1 - col) / 2) % 2 === 0;
      const y = upward ? size - 1 - rowPass : rowPass;
      for (let dx = 0; dx < 2; dx++) {
        const x = col - dx;
        if (used[y][x] || reserved(size, x, y, spec.align)) continue;
        let v = false;
        if (bit < totalBits) {
          v = Boolean((all[bit >> 3] >> (7 - (bit & 7))) & 1);
          bit++;
        }
        if ((y + x) % 2 === 0) v = !v;
        mod[y][x] = v;
        used[y][x] = true;
      }
    }
  }
  return mod;
}
