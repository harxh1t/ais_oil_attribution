import fs from 'fs';

function generateBackwardSimulationSVG() {
  const width = 540;
  const height = 580;

  // Plot box
  const plotLeft = 55;
  const plotTop = 38;
  const plotWidth = 455;
  const plotHeight = 460;
  const plotRight = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;

  // X range: 0 to 8 hours (Aug 06 00:00 to Aug 06 08:00)
  // Y range: 0 to 5.9 km
  const yMin = 0;
  const yMax = 5.9;

  function toPx(hour, val) {
    const x = plotLeft + (hour / 8) * plotWidth;
    const y = plotBottom - ((val - yMin) / (yMax - yMin)) * plotHeight;
    return { x, y };
  }

  // Curve points matching image.png exactly
  const curveData = [
    { h: 0.0,  v: 5.62 },
    { h: 0.25, v: 5.52 },
    { h: 0.55, v: 5.31 },
    { h: 0.8,  v: 5.34 },
    { h: 1.1,  v: 5.12 },
    { h: 1.4,  v: 4.99 },
    { h: 1.7,  v: 4.85 },
    { h: 1.95, v: 4.80 },
    { h: 2.2,  v: 4.64 },
    { h: 2.45, v: 4.54 },
    { h: 2.75, v: 4.35 },
    { h: 3.1,  v: 4.23 },
    { h: 3.4,  v: 4.14 },
    { h: 3.65, v: 4.07 },
    { h: 4.0,  v: 3.76 },
    { h: 4.25, v: 3.55 },
    { h: 4.5,  v: 3.51 },
    { h: 4.8,  v: 3.40 },
    { h: 5.1,  v: 3.28 },
    { h: 5.4,  v: 3.09 },
    { h: 5.65, v: 2.93 },
    { h: 5.9,  v: 2.88 },
    { h: 6.2,  v: 2.67 },
    { h: 6.5,  v: 2.67 },
    { h: 6.8,  v: 2.47 },
    { h: 7.1,  v: 2.28 },
    { h: 7.4,  v: 2.16 },
    { h: 7.65, v: 2.06 },
    { h: 7.85, v: 1.96 },
    { h: 8.0,  v: 1.72 }
  ];

  // Build line path and area polygon
  let linePath = '';
  let areaPath = '';

  curveData.forEach((pt, i) => {
    const { x, y } = toPx(pt.h, pt.v);
    if (i === 0) {
      linePath += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      areaPath += `M ${x.toFixed(1)} ${plotBottom.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      linePath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      areaPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  });

  const finalPt = toPx(8.0, 1.72);
  areaPath += ` L ${finalPt.x.toFixed(1)} ${plotBottom.toFixed(1)} Z`;

  // X ticks: Aug 06 00:00 to Aug 06 08:00
  const xTicks = [
    { h: 0, d: 'Aug 06', t: '00:00' },
    { h: 1, d: 'Aug 06', t: '01:00' },
    { h: 2, d: 'Aug 06', t: '02:00' },
    { h: 3, d: 'Aug 06', t: '03:00' },
    { h: 4, d: 'Aug 06', t: '04:00' },
    { h: 5, d: 'Aug 06', t: '05:00' },
    { h: 6, d: 'Aug 06', t: '06:00' },
    { h: 7, d: 'Aug 06', t: '07:00' },
    { h: 8, d: 'Aug 06', t: '08:00' }
  ];

  const yTicks = [0, 1, 2, 3, 4, 5];

  let gridSvg = '';
  xTicks.forEach(tick => {
    const { x } = toPx(tick.h, 0);
    gridSvg += `
      <line x1="${x.toFixed(1)}" y1="${plotTop}" x2="${x.toFixed(1)}" y2="${plotBottom}" stroke="#ebf1f6" stroke-width="0.8" />
      <line x1="${x.toFixed(1)}" y1="${plotBottom}" x2="${x.toFixed(1)}" y2="${plotBottom + 5}" stroke="#334155" stroke-width="1" />
      <text x="${x.toFixed(1)}" y="${plotBottom + 17}" font-family="Arial, Helvetica, sans-serif" font-size="10" text-anchor="middle" fill="#2d3748">${tick.d}</text>
      <text x="${x.toFixed(1)}" y="${plotBottom + 29}" font-family="Arial, Helvetica, sans-serif" font-size="10" text-anchor="middle" fill="#2d3748">${tick.t}</text>
    `;
  });

  yTicks.forEach(val => {
    const { y } = toPx(0, val);
    gridSvg += `
      <line x1="${plotLeft}" y1="${y.toFixed(1)}" x2="${plotRight}" y2="${y.toFixed(1)}" stroke="#ebf1f6" stroke-width="0.8" />
      <line x1="${plotLeft - 5}" y1="${y.toFixed(1)}" x2="${plotLeft}" y2="${y.toFixed(1)}" stroke="#334155" stroke-width="1" />
      <text x="${plotLeft - 8}" y="${(y + 4).toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" text-anchor="end" fill="#2d3748">${val}</text>
    `;
  });

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#ffffff; user-select:none;">
  <defs>
    <clipPath id="plotClipBwd">
      <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" />
    </clipPath>
  </defs>

  <!-- Plot Title -->
  <text x="${width / 2}" y="24" font-family="Arial, Helvetica, sans-serif" font-size="14.5" font-weight="bold" text-anchor="middle" fill="#0f172a">
    How spread out the oil is, over time
  </text>

  <!-- Background -->
  <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="#ffffff" />

  <!-- Grid lines -->
  ${gridSvg}

  <!-- Axis Titles -->
  <text x="${plotLeft + plotWidth / 2}" y="${plotBottom + 45}" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="middle" fill="#334155">
    Time (UTC)
  </text>
  <text transform="translate(16, ${plotTop + plotHeight / 2}) rotate(-90)" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="middle" fill="#334155">
    Particle cloud spread (km)
  </text>

  <!-- Clipped plot curves -->
  <g clip-path="url(#plotClipBwd)">
    <!-- Shaded area under curve -->
    <path d="${areaPath}" fill="#fce8e8" fill-opacity="0.85" />

    <!-- Red vertical dashed line at Aug 06 08:00 -->
    <line x1="${finalPt.x.toFixed(1)}" y1="${plotTop}" x2="${finalPt.x.toFixed(1)}" y2="${plotBottom}" stroke="#c52222" stroke-width="1.6" stroke-dasharray="4,3" />

    <!-- Main red curve -->
    <path d="${linePath}" fill="none" stroke="#c52222" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Min spread circle marker at 1.72 km -->
    <circle cx="${finalPt.x.toFixed(1)}" cy="${finalPt.y.toFixed(1)}" r="5" fill="#c52222" stroke="#000000" stroke-width="1.4" />
  </g>

  <!-- Border -->
  <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#475569" stroke-width="1.1" />

  <!-- Legend in top right -->
  <rect x="${plotRight - 156}" y="${plotTop + 10}" width="148" height="46" fill="#ffffff" fill-opacity="0.94" stroke="#cbd5e1" stroke-width="0.8" rx="2" />
  
  <line x1="${plotRight - 146}" y1="${plotTop + 22}" x2="${plotRight - 124}" y2="${plotTop + 22}" stroke="#c52222" stroke-width="2.5" stroke-linecap="round" />
  <text x="${plotRight - 118}" y="${plotTop + 26}" font-family="Arial, Helvetica, sans-serif" font-size="9.5" fill="#1e293b">Spread σ(t)</text>

  <circle cx="${plotRight - 135}" cy="${plotTop + 37}" r="4.2" fill="#c52222" stroke="#000000" stroke-width="1.2" />
  <text x="${plotRight - 118}" y="${plotTop + 40}" font-family="Arial, Helvetica, sans-serif" font-size="9.5" fill="#1e293b">Min spread (1.72 km)</text>
</svg>
  `.trim();
}

const svg = generateBackwardSimulationSVG();
fs.writeFileSync('public/images/backward_simulation_spread.svg', svg);
fs.writeFileSync('src/assets/images/backward_simulation_spread.svg', svg);
console.log('Saved backward_simulation_spread.svg successfully!');
