/**
 * Generates exact high-fidelity SVG graphics matching the user's uploaded screenshots:
 * 1. Screenshot 2026-09-26 234845.png -> Backward Hindcast: Tracing Spill Back to Source
 * 2. Screenshot 2026-09-26 234858.png -> Forward Prediction: Where the Spill Will Spread
 */

import fs from 'fs';
import path from 'path';

// Deterministic Pseudo-Random Number Generator (PRNG)
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Color interpolation for Plasma / Magma colormap
function getColormapColor(t) {
  // t from 0 to 1
  const stops = [
    { pos: 0.0, r: 71, g: 17, b: 100 },   // #471164
    { pos: 0.15, r: 103, g: 25, b: 125 }, // #67197d
    { pos: 0.3, r: 147, g: 42, b: 130 },  // #932a82
    { pos: 0.45, r: 194, g: 61, b: 110 }, // #c23d6e
    { pos: 0.6, r: 232, g: 94, b: 85 },   // #e85e55
    { pos: 0.75, r: 251, g: 144, b: 84 }, // #fb9054
    { pos: 0.9, r: 254, g: 198, b: 98 },  // #fec662
    { pos: 1.0, r: 255, g: 250, b: 145 }, // #fffa91
  ];

  if (t <= 0) return `rgb(${stops[0].r}, ${stops[0].g}, ${stops[0].b})`;
  if (t >= 1) {
    const s = stops[stops.length - 1];
    return `rgb(${s.r}, ${s.g}, ${s.b})`;
  }

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) {
      const frac = (t - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
      const r = Math.round(stops[i].r + frac * (stops[i + 1].r - stops[i].r));
      const g = Math.round(stops[i].g + frac * (stops[i + 1].g - stops[i].g));
      const b = Math.round(stops[i].b + frac * (stops[i + 1].b - stops[i].b));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return 'rgb(255, 250, 145)';
}

function generateBackwardMapSVG() {
  const width = 640;
  const height = 660;

  // Plot box area
  const plotLeft = 65;
  const plotTop = 45;
  const plotWidth = 530;
  const plotHeight = 460;
  const plotRight = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;

  // Coordinate ranges
  const lonMin = -122.96;
  const lonMax = -122.48;
  const latMin = 37.47;
  const latMax = 37.93;

  function toPx(lon, lat) {
    const x = plotLeft + ((lon - lonMin) / (lonMax - lonMin)) * plotWidth;
    const y = plotBottom - ((lat - latMin) / (latMax - latMin)) * plotHeight;
    return { x, y };
  }

  const rng = mulberry32(42);

  // Generate 7,500 particles tracing backward from (37.77, -122.65) to (37.66, -122.76)
  let particlesSVG = '';
  const numParticles = 7800;

  for (let i = 0; i < numParticles; i++) {
    // Time tau from 0 to -7 hours
    // Distribution biased towards -2 to -6
    const u = rng();
    const hours = -7 * Math.pow(u, 0.85); // -7 to 0
    const colormapT = (hours - (-7)) / 7; // 0 (at -7h) to 1 (at 0h)

    // Centerline drift trajectory from t=0 (-122.65, 37.775) to t=-7 (-122.75, 37.66)
    const prog = -hours / 7; // 0 at t=0, 1 at t=-7
    const centerLon = -122.65 - 0.10 * prog + 0.015 * Math.sin(prog * Math.PI);
    const centerLat = 37.775 - 0.115 * prog;

    // Dispersion expands as we go further back in time
    const sigmaLon = 0.035 + 0.055 * prog;
    const sigmaLat = 0.025 + 0.045 * prog;

    // Box-Muller normal transform
    const u1 = Math.max(1e-6, rng());
    const u2 = rng();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

    // Rotate dispersion ellipse along the drift axis (~48 degrees)
    const angle = 0.88;
    const rotX = z0 * sigmaLon * 0.9;
    const rotY = z1 * sigmaLat * 0.9;
    const pLon = centerLon + rotX * Math.cos(angle) - rotY * Math.sin(angle);
    const pLat = centerLat + rotX * Math.sin(angle) + rotY * Math.cos(angle);

    if (pLon >= lonMin && pLon <= lonMax && pLat >= latMin && pLat <= latMax) {
      const { x, y } = toPx(pLon, pLat);
      const color = getColormapColor(colormapT);
      const opacity = 0.35 + 0.35 * rng();
      const r = 1.35 + 0.4 * rng();
      particlesSVG += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`;
    }
  }

  // Ticks definition
  const lonTicks = [-122.9, -122.8, -122.7, -122.6, -122.5];
  const latTicks = [37.5, 37.6, 37.7, 37.8, 37.9];

  let gridAndTicksSVG = '';
  lonTicks.forEach(lon => {
    const { x } = toPx(lon, latMin);
    gridAndTicksSVG += `
      <line x1="${x.toFixed(1)}" y1="${plotTop}" x2="${x.toFixed(1)}" y2="${plotBottom}" stroke="#b0cce3" stroke-width="0.7" stroke-dasharray="1,2" />
      <line x1="${x.toFixed(1)}" y1="${plotBottom}" x2="${x.toFixed(1)}" y2="${plotBottom + 5}" stroke="#2d3748" stroke-width="1" />
      <text x="${x.toFixed(1)}" y="${plotBottom + 18}" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="middle" fill="#2d3748">${lon}</text>
    `;
  });

  latTicks.forEach(lat => {
    const { y } = toPx(lonMin, lat);
    gridAndTicksSVG += `
      <line x1="${plotLeft}" y1="${y.toFixed(1)}" x2="${plotRight}" y2="${y.toFixed(1)}" stroke="#b0cce3" stroke-width="0.7" stroke-dasharray="1,2" />
      <line x1="${plotLeft - 5}" y1="${y.toFixed(1)}" x2="${plotLeft}" y2="${y.toFixed(1)}" stroke="#2d3748" stroke-width="1" />
      <text x="${plotLeft - 8}" y="${(y + 4).toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="end" fill="#2d3748">${lat.toFixed(1)}</text>
    `;
  });

  // Markers
  const originPx = toPx(-122.66, 37.77);
  const detectPx = toPx(-122.65, 37.78);
  const tailPx = toPx(-122.74, 37.69);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#ffffff; user-select:none;">
  <defs>
    <clipPath id="plotClip">
      <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" />
    </clipPath>
    <linearGradient id="plasmaGradBackward" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#471164" />
      <stop offset="15%" stop-color="#67197d" />
      <stop offset="30%" stop-color="#932a82" />
      <stop offset="45%" stop-color="#c23d6e" />
      <stop offset="60%" stop-color="#e85e55" />
      <stop offset="75%" stop-color="#fb9054" />
      <stop offset="90%" stop-color="#fec662" />
      <stop offset="100%" stop-color="#fffa91" />
    </linearGradient>
  </defs>

  <!-- Title -->
  <text x="${width / 2}" y="28" font-family="Arial, Helvetica, sans-serif" font-size="14.5" font-weight="bold" text-anchor="middle" fill="#111827">
    Backward Hindcast: Tracing Spill Back to Source
  </text>

  <!-- Plot Background fill -->
  <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="#d9e9f6" stroke="#486581" stroke-width="1.2" />

  <!-- Grid and Ticks -->
  ${gridAndTicksSVG}

  <!-- Axis Titles -->
  <text x="${plotLeft + plotWidth / 2}" y="${plotBottom + 35}" font-family="Arial, Helvetica, sans-serif" font-size="12" text-anchor="middle" fill="#2d3748">
    Longitude (°E)
  </text>
  <text transform="translate(18, ${plotTop + plotHeight / 2}) rotate(-90)" font-family="Arial, Helvetica, sans-serif" font-size="12" text-anchor="middle" fill="#2d3748">
    Latitude (°N)
  </text>

  <!-- Clipped Particle Plume -->
  <g clip-path="url(#plotClip)">
    ${particlesSVG}

    <!-- Plume centroid path dashed line -->
    <line x1="${tailPx.x.toFixed(1)}" y1="${tailPx.y.toFixed(1)}" x2="${originPx.x.toFixed(1)}" y2="${originPx.y.toFixed(1)}" stroke="#2d3748" stroke-width="1.8" stroke-dasharray="4,3" />
    <line x1="${originPx.x.toFixed(1)}" y1="${originPx.y.toFixed(1)}" x2="${detectPx.x.toFixed(1)}" y2="${detectPx.y.toFixed(1)}" stroke="#2d3748" stroke-width="1.8" stroke-dasharray="4,3" />

    <!-- Discovered Origin (Bold Red Cross X with black outline) -->
    <g transform="translate(${originPx.x.toFixed(1)}, ${originPx.y.toFixed(1)})">
      <!-- Outer black shadow/outline -->
      <path d="M-7,-7 L-3,-7 L0,-3 L3,-7 L7,-7 L3,-1 L7,7 L3,7 L0,3 L-3,7 L-7,7 L-3,-1 Z" fill="#b91c1c" stroke="#000000" stroke-width="1.5" stroke-linejoin="round" />
      <circle cx="0" cy="0" r="2" fill="#ef4444" />
    </g>

    <!-- Detection point (Cyan Star with black outline) -->
    <g transform="translate(${detectPx.x.toFixed(1)}, ${detectPx.y.toFixed(1)})">
      <polygon points="0,-8 2.4,-2.5 8.2,-2.5 3.5,1.2 5.3,7 0,3.5 -5.3,7 -3.5,1.2 -8.2,-2.5 -2.4,-2.5" fill="#00e5ff" stroke="#000000" stroke-width="1.4" stroke-linejoin="round" />
    </g>

    <!-- Legend in Top-Left Corner -->
    <rect x="${plotLeft + 10}" y="${plotTop + 10}" width="150" height="66" fill="#ffffff" fill-opacity="0.9" stroke="#94a3b8" stroke-width="0.8" rx="2" />
    
    <!-- Legend item 1: Detection point -->
    <g transform="translate(${plotLeft + 25}, ${plotTop + 24})">
      <polygon points="0,-6 1.8,-1.9 6.2,-1.9 2.6,0.9 4,5.2 0,2.6 -4,5.2 -2.6,0.9 -6.2,-1.9 -1.8,-1.9" fill="#00e5ff" stroke="#000000" stroke-width="1.2" stroke-linejoin="round" />
    </g>
    <text x="${plotLeft + 38}" y="${plotTop + 27}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#1e293b">Detection point</text>

    <!-- Legend item 2: Discovered Origin -->
    <g transform="translate(${plotLeft + 25}, ${plotTop + 42})">
      <path d="M-5,-5 L-2,-5 L0,-2 L2,-5 L5,-5 L2,0 L5,5 L2,5 L0,2 L-2,5 L-5,5 L-2,0 Z" fill="#b91c1c" stroke="#000000" stroke-width="1.1" stroke-linejoin="round" />
    </g>
    <text x="${plotLeft + 38}" y="${plotTop + 45}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#1e293b">Discovered Origin</text>

    <!-- Legend item 3: Plume centroid path -->
    <line x1="${plotLeft + 18}" y1="${plotTop + 60}" x2="${plotLeft + 32}" y2="${plotTop + 60}" stroke="#2d3748" stroke-width="1.8" stroke-dasharray="4,2.5" />
    <text x="${plotLeft + 38}" y="${plotTop + 63}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#1e293b">Plume centroid path</text>
  </g>

  <!-- Plot Border (sharp crisp frame) -->
  <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#334155" stroke-width="1.2" />

  <!-- Colorbar at bottom -->
  <g transform="translate(${plotLeft + 40}, ${plotBottom + 64})">
    <!-- Gradient box -->
    <rect x="0" y="0" width="450" height="15" fill="url(#plasmaGradBackward)" stroke="#1e293b" stroke-width="1" />
    
    <!-- Ticks from -7 to 0 -->
    ${[-7, -6, -5, -4, -3, -2, -1, 0].map(val => {
      const frac = (val - (-7)) / 7;
      const x = frac * 450;
      return `
        <line x1="${x.toFixed(1)}" y1="15" x2="${x.toFixed(1)}" y2="20" stroke="#1e293b" stroke-width="1" />
        <text x="${x.toFixed(1)}" y="31" font-family="Arial, Helvetica, sans-serif" font-size="10.5" text-anchor="middle" fill="#334155">${val}</text>
      `;
    }).join('')}

    <!-- Label below colorbar -->
    <text x="225" y="47" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="middle" fill="#334155">
      Hours since simulation start
    </text>
  </g>
</svg>
  `.trim();
}

function generateForwardMapSVG() {
  const width = 640;
  const height = 660;

  // Plot box area
  const plotLeft = 65;
  const plotTop = 45;
  const plotWidth = 530;
  const plotHeight = 460;
  const plotRight = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;

  // Coordinate ranges
  const lonMin = -122.95;
  const lonMax = -122.10;
  const latMin = 37.50;
  const latMax = 38.30;

  function toPx(lon, lat) {
    const x = plotLeft + ((lon - lonMin) / (lonMax - lonMin)) * plotWidth;
    const y = plotBottom - ((lat - latMin) / (latMax - latMin)) * plotHeight;
    return { x, y };
  }

  const rng = mulberry32(101);

  // Generate 8,000 particles spreading forward from detection point (37.78, -122.65) to northeast
  let particlesSVG = '';
  const numParticles = 8200;

  for (let i = 0; i < numParticles; i++) {
    // Time tau from 0 to 10 hours
    const u = rng();
    const hours = 10 * Math.pow(u, 0.9); // 0 to 10
    const colormapT = hours / 10; // 0 (at 0h) to 1 (at 10h)

    // Centerline drift trajectory moving northeast
    const prog = hours / 10;
    const centerLon = -122.65 + 0.16 * prog + 0.02 * Math.sin(prog * Math.PI);
    const centerLat = 37.78 + 0.15 * prog;

    // Dispersion expands radially over forward time
    const sigmaLon = 0.04 + 0.09 * prog;
    const sigmaLat = 0.035 + 0.08 * prog;

    // Box-Muller normal transform
    const u1 = Math.max(1e-6, rng());
    const u2 = rng();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

    const angle = 0.72;
    const rotX = z0 * sigmaLon;
    const rotY = z1 * sigmaLat;
    const pLon = centerLon + rotX * Math.cos(angle) - rotY * Math.sin(angle);
    const pLat = centerLat + rotX * Math.sin(angle) + rotY * Math.cos(angle);

    if (pLon >= lonMin && pLon <= lonMax && pLat >= latMin && pLat <= latMax) {
      const { x, y } = toPx(pLon, pLat);
      const color = getColormapColor(colormapT);
      const opacity = 0.32 + 0.35 * rng();
      const r = 1.35 + 0.45 * rng();
      particlesSVG += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`;
    }
  }

  // Ticks definition: -122.8, -122.6, -122.4, -122.2
  const lonTicks = [-122.8, -122.6, -122.4, -122.2];
  // 37.6, 37.8, 38.0, 38.2
  const latTicks = [37.6, 37.8, 38.0, 38.2];

  let gridAndTicksSVG = '';
  lonTicks.forEach(lon => {
    const { x } = toPx(lon, latMin);
    gridAndTicksSVG += `
      <line x1="${x.toFixed(1)}" y1="${plotTop}" x2="${x.toFixed(1)}" y2="${plotBottom}" stroke="#b0cce3" stroke-width="0.7" stroke-dasharray="1,2" />
      <line x1="${x.toFixed(1)}" y1="${plotBottom}" x2="${x.toFixed(1)}" y2="${plotBottom + 5}" stroke="#2d3748" stroke-width="1" />
      <text x="${x.toFixed(1)}" y="${plotBottom + 18}" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="middle" fill="#2d3748">${lon.toFixed(1)}</text>
    `;
  });

  latTicks.forEach(lat => {
    const { y } = toPx(lonMin, lat);
    gridAndTicksSVG += `
      <line x1="${plotLeft}" y1="${y.toFixed(1)}" x2="${plotRight}" y2="${y.toFixed(1)}" stroke="#b0cce3" stroke-width="0.7" stroke-dasharray="1,2" />
      <line x1="${plotLeft - 5}" y1="${y.toFixed(1)}" x2="${plotLeft}" y2="${y.toFixed(1)}" stroke="#2d3748" stroke-width="1" />
      <text x="${plotLeft - 8}" y="${(y + 4).toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="end" fill="#2d3748">${lat.toFixed(1)}</text>
    `;
  });

  const detectPx = toPx(-122.65, 37.78);
  const headPx = toPx(-122.48, 37.93);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#ffffff; user-select:none;">
  <defs>
    <clipPath id="plotClipForward">
      <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" />
    </clipPath>
    <linearGradient id="plasmaGradForward" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#471164" />
      <stop offset="20%" stop-color="#7e2482" />
      <stop offset="40%" stop-color="#c23d6e" />
      <stop offset="60%" stop-color="#e85e55" />
      <stop offset="80%" stop-color="#fec662" />
      <stop offset="100%" stop-color="#fffa91" />
    </linearGradient>
  </defs>

  <!-- Title -->
  <text x="${width / 2}" y="28" font-family="Arial, Helvetica, sans-serif" font-size="14.5" font-weight="bold" text-anchor="middle" fill="#111827">
    Forward Prediction: Where the Spill Will Spread
  </text>

  <!-- Plot Background fill -->
  <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="#d9e9f6" stroke="#486581" stroke-width="1.2" />

  <!-- Grid and Ticks -->
  ${gridAndTicksSVG}

  <!-- Axis Titles -->
  <text x="${plotLeft + plotWidth / 2}" y="${plotBottom + 35}" font-family="Arial, Helvetica, sans-serif" font-size="12" text-anchor="middle" fill="#2d3748">
    Longitude (°E)
  </text>
  <text transform="translate(18, ${plotTop + plotHeight / 2}) rotate(-90)" font-family="Arial, Helvetica, sans-serif" font-size="12" text-anchor="middle" fill="#2d3748">
    Latitude (°N)
  </text>

  <!-- Clipped Particle Plume -->
  <g clip-path="url(#plotClipForward)">
    ${particlesSVG}

    <!-- Plume centroid path dashed line -->
    <line x1="${detectPx.x.toFixed(1)}" y1="${detectPx.y.toFixed(1)}" x2="${headPx.x.toFixed(1)}" y2="${headPx.y.toFixed(1)}" stroke="#2d3748" stroke-width="1.8" stroke-dasharray="4,3" />

    <!-- Detection point (Cyan Star with black outline) -->
    <g transform="translate(${detectPx.x.toFixed(1)}, ${detectPx.y.toFixed(1)})">
      <polygon points="0,-8 2.4,-2.5 8.2,-2.5 3.5,1.2 5.3,7 0,3.5 -5.3,7 -3.5,1.2 -8.2,-2.5 -2.4,-2.5" fill="#00e5ff" stroke="#000000" stroke-width="1.4" stroke-linejoin="round" />
    </g>

    <!-- Legend in Top-Left Corner -->
    <rect x="${plotLeft + 10}" y="${plotTop + 10}" width="150" height="48" fill="#ffffff" fill-opacity="0.9" stroke="#94a3b8" stroke-width="0.8" rx="2" />
    
    <!-- Legend item 1: Detection point -->
    <g transform="translate(${plotLeft + 25}, ${plotTop + 24})">
      <polygon points="0,-6 1.8,-1.9 6.2,-1.9 2.6,0.9 4,5.2 0,2.6 -4,5.2 -2.6,0.9 -6.2,-1.9 -1.8,-1.9" fill="#00e5ff" stroke="#000000" stroke-width="1.2" stroke-linejoin="round" />
    </g>
    <text x="${plotLeft + 38}" y="${plotTop + 27}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#1e293b">Detection point</text>

    <!-- Legend item 2: Plume centroid path -->
    <line x1="${plotLeft + 18}" y1="${plotTop + 42}" x2="${plotLeft + 32}" y2="${plotTop + 42}" stroke="#2d3748" stroke-width="1.8" stroke-dasharray="4,2.5" />
    <text x="${plotLeft + 38}" y="${plotTop + 45}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#1e293b">Plume centroid path</text>
  </g>

  <!-- Plot Border (sharp crisp frame) -->
  <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#334155" stroke-width="1.2" />

  <!-- Colorbar at bottom -->
  <g transform="translate(${plotLeft + 40}, ${plotBottom + 64})">
    <!-- Gradient box -->
    <rect x="0" y="0" width="450" height="15" fill="url(#plasmaGradForward)" stroke="#1e293b" stroke-width="1" />
    
    <!-- Ticks from 0 to 10 -->
    ${[0, 2, 4, 6, 8, 10].map(val => {
      const frac = val / 10;
      const x = frac * 450;
      return `
        <line x1="${x.toFixed(1)}" y1="15" x2="${x.toFixed(1)}" y2="20" stroke="#1e293b" stroke-width="1" />
        <text x="${x.toFixed(1)}" y="31" font-family="Arial, Helvetica, sans-serif" font-size="10.5" text-anchor="middle" fill="#334155">${val}</text>
      `;
    }).join('')}

    <!-- Label below colorbar -->
    <text x="225" y="47" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="middle" fill="#334155">
      Hours since simulation start
    </text>
  </g>
</svg>
  `.trim();
}

// Write the files to public/images and src/assets/images
const publicImagesDir = path.resolve('/app/applet/public/images');
const srcImagesDir = path.resolve('/app/applet/src/assets/images');

fs.writeFileSync(path.join(publicImagesDir, 'backward_drift_map.svg'), generateBackwardMapSVG());
fs.writeFileSync(path.join(publicImagesDir, 'forward_drift_map.svg'), generateForwardMapSVG());

fs.writeFileSync(path.join(srcImagesDir, 'backward_drift_map.svg'), generateBackwardMapSVG());
fs.writeFileSync(path.join(srcImagesDir, 'forward_drift_map.svg'), generateForwardMapSVG());

console.log('Successfully generated identical backward and forward drift map SVGs!');
