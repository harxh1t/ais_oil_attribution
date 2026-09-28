const { spawn } = require('child_process');
const path = require('path');

const width = 960;
const height = 540;
const fps = 30;
const durationSec = 4;
const totalFrames = fps * durationSec; // exactly 120 frames = 4.0 seconds

const outputPath = path.join(__dirname, '../public/videos/forensic_drift.mp4');

// Set up ffmpeg process
const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'image2pipe',
  '-vcodec', 'ppm',
  '-r', String(fps),
  '-i', '-',
  '-vf', `drawtext=fontfile=/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf:text='● FORENSIC DRIFT RECONSTRUCTION (4.0s)' :x=30:y=30:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6,drawtext=fontfile=/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf:text='T+%{eif\\:t\\:d}.%{eif\\:mod(t*100,100)\\:02d}s | CORRIDOR AIS-774':x=30:y=65:fontsize=14:fontcolor=0x38bdf8:box=1:boxcolor=black@0.6:boxborderw=5,drawtext=fontfile=/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf:text='VESSEL: IMO 9243306 (CALIFORNIA) | MATCH: 94.2%':x=30:y=h-50:fontsize=14:fontcolor=0x4ade80:box=1:boxcolor=black@0.6:boxborderw=5`,
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '22',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  outputPath
], { stdio: ['pipe', 'inherit', 'inherit'] });

const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
const frameSize = width * height * 3;
const frameBuf = Buffer.alloc(frameSize);

// Particles for oil slick drift simulation
const numParticles = 600;
const particles = [];
for (let i = 0; i < numParticles; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.pow(Math.random(), 0.7) * 45;
  particles.push({
    baseX: width * 0.38 + Math.cos(angle) * dist,
    baseY: height * 0.58 + Math.sin(angle) * dist * 0.6,
    driftVx: 18 + Math.random() * 8, // drifts right-upward with ocean current
    driftVy: -12 - Math.random() * 6,
    spread: 1.5 + Math.random() * 3,
    size: Math.random() < 0.2 ? 3 : 2,
    brightness: 0.6 + Math.random() * 0.4
  });
}

for (let frame = 0; frame < totalFrames; frame++) {
  const t = frame / fps; // 0.0 to 4.0
  const progress = frame / totalFrames;

  // Clear background with dark maritime oceanic gradient
  for (let y = 0; y < height; y++) {
    const yRatio = y / height;
    const r = Math.floor(6 + yRatio * 8);
    const g = Math.floor(14 + yRatio * 10);
    const b = Math.floor(28 + yRatio * 18);
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      frameBuf[idx] = r;
      frameBuf[idx + 1] = g;
      frameBuf[idx + 2] = b;
    }
  }

  // Draw nautical grid lines
  const gridSpacing = 60;
  for (let x = 0; x < width; x += gridSpacing) {
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 3;
      frameBuf[idx] = Math.min(255, frameBuf[idx] + 10);
      frameBuf[idx + 1] = Math.min(255, frameBuf[idx + 1] + 20);
      frameBuf[idx + 2] = Math.min(255, frameBuf[idx + 2] + 35);
    }
  }
  for (let y = 0; y < height; y += gridSpacing) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      frameBuf[idx] = Math.min(255, frameBuf[idx] + 10);
      frameBuf[idx + 1] = Math.min(255, frameBuf[idx + 1] + 20);
      frameBuf[idx + 2] = Math.min(255, frameBuf[idx + 2] + 35);
    }
  }

  // Radar center
  const cx = width * 0.52;
  const cy = height * 0.50;

  // Concentric radar rings
  const rings = [80, 160, 240, 320];
  for (const radius of rings) {
    for (let theta = 0; theta < Math.PI * 2; theta += 0.005) {
      const px = Math.floor(cx + Math.cos(theta) * radius);
      const py = Math.floor(cy + Math.sin(theta) * radius);
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 3;
        frameBuf[idx] = Math.min(255, frameBuf[idx] + 18);
        frameBuf[idx + 1] = Math.min(255, frameBuf[idx + 1] + 35);
        frameBuf[idx + 2] = Math.min(255, frameBuf[idx + 2] + 60);
      }
    }
  }

  // Radar sweep beam (rotates 360 degrees per 2 seconds => 2 complete rotations)
  const sweepAngle = (t * Math.PI) - Math.PI / 2;
  const maxR = 360;
  for (let r = 0; r < maxR; r += 1) {
    const sx = Math.floor(cx + Math.cos(sweepAngle) * r);
    const sy = Math.floor(cy + Math.sin(sweepAngle) * r);
    if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
      const idx = (sy * width + sx) * 3;
      frameBuf[idx] = 30;
      frameBuf[idx + 1] = 160;
      frameBuf[idx + 2] = 255;
    }
  }

  // Radar phosphor sweep trail (fading sector behind sweep)
  for (let da = 0.02; da < 0.55; da += 0.02) {
    const trailAngle = sweepAngle - da;
    const fade = (1 - da / 0.55) * 40;
    for (let r = 10; r < maxR; r += 3) {
      const tx = Math.floor(cx + Math.cos(trailAngle) * r);
      const ty = Math.floor(cy + Math.sin(trailAngle) * r);
      if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
        const idx = (ty * width + tx) * 3;
        frameBuf[idx + 1] = Math.min(255, frameBuf[idx + 1] + Math.floor(fade * 0.8));
        frameBuf[idx + 2] = Math.min(255, frameBuf[idx + 2] + Math.floor(fade * 1.5));
      }
    }
  }

  // Draw AIS vessel trajectory line
  const startX = width * 0.22;
  const startY = height * 0.76;
  const endX = width * 0.82;
  const endY = height * 0.28;
  const vesselX = startX + (endX - startX) * (0.2 + progress * 0.65);
  const vesselY = startY + (endY - startY) * (0.2 + progress * 0.65);

  // Draw vessel track history (dashed / cyan)
  for (let p = 0; p <= 1; p += 0.003) {
    const curX = Math.floor(startX + (vesselX - startX) * p);
    const curY = Math.floor(startY + (vesselY - startY) * p);
    if (curX >= 0 && curX < width && curY >= 0 && curY < height) {
      const idx = (curY * width + curX) * 3;
      frameBuf[idx] = 16;
      frameBuf[idx + 1] = 185;
      frameBuf[idx + 2] = 129;
    }
  }

  // Draw Vessel icon (Triangle / Diamond)
  const vSize = 8;
  for (let dy = -vSize; dy <= vSize; dy++) {
    for (let dx = -vSize; dx <= vSize; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= vSize) {
        const px = Math.floor(vesselX + dx);
        const py = Math.floor(vesselY + dy);
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 3;
          frameBuf[idx] = 52;
          frameBuf[idx + 1] = 211;
          frameBuf[idx + 2] = 153; // Greenish emerald
        }
      }
    }
  }

  // Draw Oil Spill particles drifting and expanding
  for (const p of particles) {
    const curDriftX = p.baseX + p.driftVx * t + (Math.sin(p.baseY + t * 2) * 4);
    const curDriftY = p.baseY + p.driftVy * t + (Math.cos(p.baseX + t * 2) * 3);
    const spreadX = (Math.random() - 0.5) * p.spread * (1 + t * 0.5);
    const spreadY = (Math.random() - 0.5) * p.spread * (1 + t * 0.5);

    const px = Math.floor(curDriftX + spreadX);
    const py = Math.floor(curDriftY + spreadY);

    if (px >= 1 && px < width - 1 && py >= 1 && py < height - 1) {
      // Heatmap color: Purple/Magenta to Bright Amber/Orange
      const rVal = Math.floor(244 * p.brightness);
      const gVal = Math.floor(63 * p.brightness * (1 - progress * 0.3));
      const bVal = Math.floor(94 * (1 - progress * 0.5));

      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const idx = ((py + oy) * width + (px + ox)) * 3;
          frameBuf[idx] = Math.min(255, frameBuf[idx] + rVal);
          frameBuf[idx + 1] = Math.min(255, frameBuf[idx + 1] + gVal);
          frameBuf[idx + 2] = Math.min(255, frameBuf[idx + 2] + bVal);
        }
      }
    }
  }

  // Write header & frame buffer
  ffmpeg.stdin.write(header);
  ffmpeg.stdin.write(frameBuf);
}

ffmpeg.stdin.end();
ffmpeg.on('close', (code) => {
  console.log(`FFmpeg finished with code ${code}`);
  process.exit(code);
});
