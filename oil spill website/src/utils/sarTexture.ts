/**
 * Deterministic procedural SAR texture generator
 * Renders C-band SAR backscatter with wind-roughened sea surface,
 * multiplicative gamma speckle, and capillary-wave dampening slick blobs.
 * Uses a pure seeded PRNG (no Math.random()).
 */

interface RenderSarOptions {
  w: number;
  h: number;
  seed: number;
  band?: 'VV' | 'VH';
  calibrated?: boolean;
  slick?: boolean;
  slickCenter?: { x: number; y: number };
  slickScale?: { rx: number; ry: number; angleRad: number };
}

// Simple deterministic Mulberry32 PRNG
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2D Value Noise with bilinear interpolation
function createNoise2D(rand: () => number, grid = 32) {
  const perm: number[] = [];
  for (let i = 0; i < grid * grid; i++) {
    perm.push(rand());
  }
  return (x: number, y: number): number => {
    const xi = Math.floor(x) % grid;
    const yi = Math.floor(y) % grid;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const s = xf * xf * (3 - 2 * xf);
    const t = yf * yf * (3 - 2 * yf);

    const i00 = ((yi + grid) % grid) * grid + ((xi + grid) % grid);
    const i10 = ((yi + grid) % grid) * grid + ((xi + 1 + grid) % grid);
    const i01 = ((yi + 1 + grid) % grid) * grid + ((xi + grid) % grid);
    const i11 = ((yi + 1 + grid) % grid) * grid + ((xi + 1 + grid) % grid);

    const v00 = perm[i00];
    const v10 = perm[i10];
    const v01 = perm[i01];
    const v11 = perm[i11];

    const v0 = v00 * (1 - s) + v10 * s;
    const v1 = v01 * (1 - s) + v11 * s;
    return v0 * (1 - t) + v1 * t;
  };
}

const textureCache = new Map<string, HTMLCanvasElement>();

export function renderSar(opts: RenderSarOptions): HTMLCanvasElement {
  const {
    w,
    h,
    seed,
    band = 'VV',
    calibrated = true,
    slick = true,
    slickCenter = { x: 0.65, y: 0.52 },
    slickScale = { rx: 0.22, ry: 0.08, angleRad: (100 * Math.PI) / 180 },
  } = opts;

  const key = `${w}_${h}_${seed}_${band}_${calibrated ? 1 : 0}_${slick ? 1 : 0}`;
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const rand = mulberry32(seed);
  const noise1 = createNoise2D(rand, 64);
  const noise2 = createNoise2D(rand, 32);

  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const cx = slickCenter.x * w;
  const cy = slickCenter.y * h;
  const rx = slickScale.rx * w;
  const ry = slickScale.ry * h;
  const cosA = Math.cos(slickScale.angleRad);
  const sinA = Math.sin(slickScale.angleRad);

  const baseGain = band === 'VV' ? 1.0 : 0.65;
  const speckleIntensity = calibrated ? 0.18 : 0.65;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Wind-streaked sea surface
      const nx = x * 0.015;
      const ny = y * 0.015;
      const n = noise1(nx, ny) * 0.6 + noise2(nx * 2, ny * 2) * 0.4;

      // Base sea brightness
      let brightness = (0.28 + n * 0.35) * baseGain;

      // Check if inside slick
      if (slick) {
        const dx = x - cx;
        const dy = y - cy;
        const rotX = (dx * cosA + dy * sinA) / rx;
        const rotY = (-dx * sinA + dy * cosA) / ry;
        const distSq = rotX * rotX + rotY * rotY;

        // Soft organic boundary
        const warp = (noise1(nx * 3, ny * 3) - 0.5) * 0.3;
        const threshold = 1.0 + warp;

        if (distSq < threshold) {
          const edgeDist = Math.max(0, 1.0 - distSq / threshold);
          const damping = 0.25 + (1 - edgeDist) * 0.75;
          brightness *= damping;
        }
      }

      // Multiplicative gamma speckle
      const sp = 1.0 + (rand() - 0.5) * speckleIntensity;
      brightness *= sp;

      // Color grading towards violet-slate deep ocean
      const lum = Math.min(Math.max(brightness, 0), 1);
      const r = Math.floor(lum * 140 * 0.6);
      const g = Math.floor(lum * 130 * 0.55);
      const b = Math.floor(lum * 190 * 0.95);

      const idx = (y * w + x) * 4;
      data[idx] = r + 12;
      data[idx + 1] = g + 10;
      data[idx + 2] = b + 24;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  textureCache.set(key, canvas);
  return canvas;
}
