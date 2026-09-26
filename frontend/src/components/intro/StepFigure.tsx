import React, { useState, useEffect, useRef } from 'react';
import { renderSar } from '../../utils/sarTexture';
import { MALIBU_CASE } from '../../data/malibuCase';
import { Clock, MapPin, Sliders, Wind, Compass, CheckCircle } from 'lucide-react';

interface StepFigureProps {
  step: number;
}

export const StepFigure: React.FC<StepFigureProps> = ({ step }) => {
  const [imageError, setImageError] = useState(true);
  const imgUrl = `/images/steps/step-0${step}.webp`;

  // Step 2 Slider state (Raw vs Calibrated)
  const [calibratedSlider, setCalibratedSlider] = useState(50);

  // Step 3 Toggle (Mask vs Probability)
  const [step3Mode, setStep3Mode] = useState<'mask' | 'prob'>('mask');

  // Step 5 Hindcast scrubber
  const [step5Time, setStep5Time] = useState(0.5);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Procedural canvas rendering fallback
  useEffect(() => {
    if (!imageError) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = (canvas.width = canvas.parentElement?.clientWidth || 540);
    const h = (canvas.height = 340);

    if (step === 1) {
      // Step 1: Split view (SAR swath thumbnail on left, AIS tracks on right)
      const sarCanvas = renderSar({ w: Math.floor(w * 0.48), h, seed: 101, slick: true });
      ctx.drawImage(sarCanvas, 0, 0);

      // Footprint overlay on left
      ctx.strokeStyle = '#2DD4BF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(16, 16, Math.floor(w * 0.48) - 32, h - 32);

      // Right half: dark map with AIS tracks
      ctx.fillStyle = '#070512';
      ctx.fillRect(Math.floor(w * 0.48), 0, Math.floor(w * 0.52), h);
      ctx.strokeStyle = 'rgba(167,139,250,0.15)';
      ctx.beginPath();
      ctx.moveTo(w * 0.48, 0);
      ctx.lineTo(w * 0.48, h);
      ctx.stroke();

      // Draw faint tracks
      MALIBU_CASE.vessels.forEach((v, idx) => {
        ctx.strokeStyle = idx === 0 ? '#2DD4BF' : 'rgba(196,181,253,0.35)';
        ctx.lineWidth = idx === 0 ? 2 : 1;
        ctx.beginPath();
        v.track.forEach((pt, pIdx) => {
          const px = w * 0.52 + (pt.lon - -118.9) * (w * 0.4 / 0.35);
          const py = h * 0.15 + (34.08 - pt.lat) * (h * 0.7 / 0.15);
          if (pIdx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      });
    } else if (step === 2) {
      // Step 2: VV and VH tiles with Raw vs Calibrated slider
      const isCalibrated = calibratedSlider > 50;
      const sarVV = renderSar({
        w: Math.floor(w * 0.5),
        h,
        seed: 202,
        band: 'VV',
        calibrated: isCalibrated,
        slick: true,
      });
      const sarVH = renderSar({
        w: Math.floor(w * 0.5),
        h,
        seed: 203,
        band: 'VH',
        calibrated: isCalibrated,
        slick: true,
      });

      ctx.drawImage(sarVV, 0, 0);
      ctx.drawImage(sarVH, Math.floor(w * 0.5), 0);

      ctx.strokeStyle = 'rgba(167,139,250,0.3)';
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
    } else if (step === 3) {
      // Step 3: SAR tile with segmentation mask or probability heat ramp
      const sarBase = renderSar({ w, h, seed: 303, calibrated: true, slick: true });
      ctx.drawImage(sarBase, 0, 0);

      // Overlay mask or probability
      const cx = w * 0.65;
      const cy = h * 0.52;
      if (step3Mode === 'mask') {
        ctx.fillStyle = 'rgba(244, 114, 182, 0.28)';
        ctx.strokeStyle = '#F472B6';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 75, 26, (100 * Math.PI) / 180, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Probability heatmap
        const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 80);
        grad.addColorStop(0, 'rgba(244, 114, 182, 0.7)');
        grad.addColorStop(0.5, 'rgba(124, 58, 237, 0.4)');
        grad.addColorStop(1, 'rgba(124, 58, 237, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 80, 32, (100 * Math.PI) / 180, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (step === 4) {
      // Step 4: Spill Characterization polygon, vertices, centroid cross, callouts
      const sarBase = renderSar({ w, h, seed: 404, calibrated: true, slick: true });
      ctx.drawImage(sarBase, 0, 0);

      const cx = w * 0.65;
      const cy = h * 0.52;

      // Draw polygon vertices
      ctx.strokeStyle = '#2DD4BF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 85, 28, (100 * Math.PI) / 180, 0, Math.PI * 2);
      ctx.stroke();

      // Centroid Cross
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 8);
      ctx.stroke();

      // Dimension callout lines
      ctx.strokeStyle = '#FBBF24';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cx - 85, cy);
      ctx.lineTo(cx + 85, cy);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (step === 5) {
      // Step 5: OpenDrift Backward hindcast vs Forward prediction
      ctx.fillStyle = '#070512';
      ctx.fillRect(0, 0, w, h);

      const detX = w * 0.75;
      const detY = h * 0.48;
      const srcX = w * 0.28;
      const srcY = h * 0.58;

      // Draw wind & current vectors
      ctx.strokeStyle = 'rgba(196, 181, 253, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(30, 40);
      ctx.lineTo(75, 46);
      ctx.stroke();

      // Detection Point (Star)
      ctx.fillStyle = '#2DD4BF';
      ctx.beginPath();
      ctx.arc(detX, detY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Inferred Source (X)
      ctx.strokeStyle = '#F472B6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(srcX - 5, srcY - 5);
      ctx.lineTo(srcX + 5, srcY + 5);
      ctx.moveTo(srcX + 5, srcY - 5);
      ctx.lineTo(srcX - 5, srcY + 5);
      ctx.stroke();

      // Pink particle clouds animated by step5Time
      for (let i = 0; i < 60; i++) {
        const t = (i / 60 + step5Time) % 1.0;
        const px = detX + (srcX - detX) * t;
        const py = detY + (srcY - detY) * t + Math.sin(t * Math.PI) * ((i % 10) - 5) * 4;
        ctx.fillStyle = 'rgba(244, 114, 182, 0.7)';
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (step === 6) {
      // Step 6: AIS Vessel Analysis Funnel & highlighted candidates
      ctx.fillStyle = '#070512';
      ctx.fillRect(0, 0, w, h);

      // Many background faint gray tracks
      ctx.strokeStyle = 'rgba(150, 145, 179, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.1, h * 0.1 + i * 28);
        ctx.lineTo(w * 0.9, h * 0.3 + i * 28);
        ctx.stroke();
      }

      // 3 highlighted candidates
      const colors = ['#2DD4BF', '#FBBF24', '#C4B5FD'];
      colors.forEach((col, idx) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = idx === 0 ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.18, h * 0.25 + idx * 35);
        ctx.lineTo(w * 0.82, h * 0.65 + idx * 35);
        ctx.stroke();
      });

      // Proximity bounding box around closest approach
      ctx.strokeStyle = '#7C3AED';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(w * 0.42, h * 0.38, 70, 70);
      ctx.setLineDash([]);
    } else if (step === 7) {
      // Step 7: Evidence Fusion (4 tiles converging into score matrix)
      ctx.fillStyle = '#0E0B1F';
      ctx.fillRect(0, 0, w, h);

      const tileW = Math.floor(w * 0.2);
      const tileH = Math.floor(h * 0.35);
      const tiles = ['AIS Continuity', 'OpenDrift Hindcast', 'Spatial DCPA', 'Temporal TCPA'];

      tiles.forEach((t, i) => {
        const tx = w * 0.08 + (i % 2) * (tileW + 20);
        const ty = h * 0.12 + Math.floor(i / 2) * (tileH + 16);
        ctx.fillStyle = '#151230';
        ctx.fillRect(tx, ty, tileW, tileH);
        ctx.strokeStyle = 'rgba(167,139,250,0.2)';
        ctx.strokeRect(tx, ty, tileW, tileH);

        ctx.fillStyle = '#C0BCDB';
        ctx.font = '11px "Inter", sans-serif';
        ctx.fillText(t, tx + 6, ty + 16);
      });

      // Heatmap matrix on right
      const mx = w * 0.60;
      const my = h * 0.18;
      ctx.fillStyle = '#151230';
      ctx.fillRect(mx, my, w * 0.32, h * 0.64);
      ctx.strokeStyle = '#7C3AED';
      ctx.strokeRect(mx, my, w * 0.32, h * 0.64);
      ctx.fillStyle = '#F4F2FF';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('BORDA MATRIX', mx + 12, my + 24);
    } else if (step === 8) {
      // Step 8: Mini dashboard mock
      ctx.fillStyle = '#070512';
      ctx.fillRect(0, 0, w, h);

      // Podium 1-2-3
      const podW = 55;
      // Rank 2
      ctx.fillStyle = '#1E1A40';
      ctx.fillRect(w * 0.12, h * 0.45, podW, h * 0.45);
      // Rank 1
      ctx.fillStyle = '#7C3AED';
      ctx.fillRect(w * 0.28, h * 0.25, podW, h * 0.65);
      // Rank 3
      ctx.fillStyle = '#151230';
      ctx.fillRect(w * 0.44, h * 0.55, podW, h * 0.35);

      // Mini checklist dossier on right
      ctx.fillStyle = '#0E0B1F';
      ctx.fillRect(w * 0.60, h * 0.15, w * 0.34, h * 0.72);
      ctx.strokeStyle = 'rgba(167,139,250,0.25)';
      ctx.strokeRect(w * 0.60, h * 0.15, w * 0.34, h * 0.72);

      ctx.fillStyle = '#F4F2FF';
      ctx.font = '12px "Space Grotesk", sans-serif';
      ctx.fillText('FORENSIC DOSSIER', w * 0.63, h * 0.26);
    }
  }, [step, imageError, calibratedSlider, step3Mode, step5Time]);

  return (
    <div className="relative w-full h-[320px] sm:h-[360px] rounded-[14px] overflow-hidden bg-[#070512] flex flex-col justify-between">
      {/* Try loading image from public folder, else fallback to procedural canvas */}
      {!imageError ? (
        <img
          src={imgUrl}
          alt={`Step 0${step} figure`}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <canvas ref={canvasRef} className="w-full h-full block" />
      )}

      {/* Interactive Controls Overlay for specific steps */}
      {step === 1 && (
        <div className="absolute bottom-2 left-3 right-3 bg-[#0E0B1F]/90 border border-[rgba(167,139,250,0.2)] rounded px-3 py-1.5 flex items-center justify-between text-xs font-mono text-[#C0BCDB] backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>2024-08-06 01:50 UTC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>34.0169° N, 118.6631° W</span>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="absolute bottom-2 left-3 right-3 bg-[#0E0B1F]/90 border border-[rgba(167,139,250,0.2)] rounded p-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-sans text-[#C0BCDB] backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-[#9691B3] font-mono">Raw ⇄ Calibrated</span>
            <input
              type="range"
              min={0}
              max={100}
              value={calibratedSlider}
              onChange={(e) => setCalibratedSlider(Number(e.target.value))}
              className="w-24 accent-[#7C3AED] cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#9691B3] font-mono">
            <span>VV (Left)</span>
            <span>·</span>
            <span>VH (Right)</span>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="absolute bottom-2 right-3 bg-[#0E0B1F]/90 border border-[rgba(167,139,250,0.2)] rounded p-1 flex items-center gap-1 text-xs font-sans text-[#C0BCDB] backdrop-blur-md">
          <button
            onClick={() => setStep3Mode('mask')}
            className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
              step3Mode === 'mask' ? 'bg-[#7C3AED] text-white font-medium' : 'text-[#9691B3] hover:text-white'
            }`}
          >
            Binary Mask
          </button>
          <button
            onClick={() => setStep3Mode('prob')}
            className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
              step3Mode === 'prob' ? 'bg-[#7C3AED] text-white font-medium' : 'text-[#9691B3] hover:text-white'
            }`}
          >
            Probability Ramp
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="absolute bottom-2 left-3 right-3 bg-[#0E0B1F]/90 border border-[rgba(167,139,250,0.2)] rounded px-3 py-1.5 flex items-center justify-between gap-2 text-xs font-mono text-[#C0BCDB] backdrop-blur-md">
          <span className="text-[#F472B6]">Scrub Hindcast:</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={step5Time}
            onChange={(e) => setStep5Time(parseFloat(e.target.value))}
            className="flex-1 accent-[#F472B6] cursor-pointer"
          />
          <span className="text-[#9691B3]">T-{(step5Time * 9.2).toFixed(1)}h</span>
        </div>
      )}
    </div>
  );
};
