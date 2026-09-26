import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../../context/CaseContext';
import { CliModal } from './CliModal';
import { ChapterHeader, GlowCard, Button, Badge } from '../ui';
import { Terminal } from 'lucide-react';

export const CaseSection: React.FC = () => {
  const navigate = useNavigate();
  const { loadExample } = useCase();
  const [isCliOpen, setIsCliOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleStartInvestigation = () => {
    loadExample();
    navigate('/investigate');
  };

  // Render procedural SAR mini-preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = (canvas.width = 440);
    const h = (canvas.height = 300);

    // Deep sea noise background
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, w, h);

    // Radar speckle texture
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const alpha = Math.random() * 0.12;
      ctx.fillStyle = `rgba(183, 173, 255, ${alpha})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Inferred Release Point & Ellipse (Pink Dotted)
    const rx = w * 0.32;
    const ry = h * 0.58;
    ctx.strokeStyle = '#F472B6';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 26, 14, 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // Release Point marker
    ctx.fillStyle = '#F472B6';
    ctx.beginPath();
    ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Backward Hindcast Stream (Pink dots)
    ctx.fillStyle = 'rgba(244, 114, 182, 0.5)';
    for (let i = 0; i < 60; i++) {
      const t = i / 60;
      const px = rx + (w * 0.65 - rx) * t + (Math.random() - 0.5) * 14;
      const py = ry + (h * 0.42 - ry) * t + (Math.random() - 0.5) * 10;
      ctx.fillRect(px, py, 2, 2);
    }

    // Observed Slick Contour (Teal Solid)
    const cx = w * 0.65;
    const cy = h * 0.42;
    ctx.setLineDash([]);
    ctx.strokeStyle = '#2DD4BF';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(45, 212, 191, 0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 42, 16, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Vessel Track: MV Meridian Crest
    ctx.strokeStyle = '#6A4DFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx - 45, ry - 35);
    ctx.lineTo(rx + 65, ry + 45);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(rx + 15, ry + 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // Faint Graticule
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, 0);
    ctx.lineTo(w * 0.35, h);
    ctx.moveTo(0, h * 0.45);
    ctx.lineTo(w, h * 0.45);
    ctx.stroke();
  }, []);

  return (
    <section
      id="case"
      className="py-[72px] lg:py-[120px] bg-[var(--bg-base)] border-t border-[var(--border-default)] relative overflow-hidden"
    >
      <div className="max-w-[1200px] mx-auto px-4 space-y-12">
        {/* Chapter Header */}
        <ChapterHeader
          number="04"
          eyebrow="EXAMPLE CASE"
          title="Case WAKE-2024-0806-MLB // Malibu, Santa Monica Bay"
        />

        {/* GlowCard with ambient wine/violet radial backdrops */}
        <GlowCard className="p-8 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* LEFT COLUMN (7 cols) */}
            <div className="lg:col-span-7 space-y-6 relative z-10">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="neutral">
                  EXAMPLE CASE
                </Badge>
                <Badge variant="neutral">
                  SIMULATED DEMONSTRATION DATA
                </Badge>
              </div>

              {/* Description in Source Serif 4 */}
              <p className="font-serif text-[17px] sm:text-[19px] leading-[1.7] text-[var(--text-2)] max-w-[68ch]">
                Walk through a complete WAKE investigation on a simulated case off Malibu, California: set the parameters, run the hindcast, review a ranked shortlist of six fictional vessels with the evidence behind it, then inspect the reconstruction in 3D.
              </p>

              {/* Three Stat Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-3)] block uppercase tracking-wider">
                    OBSERVATION
                  </span>
                  <span className="text-[var(--text-1)] font-semibold mt-1 block">
                    2024-08-06 01:50:00 UTC
                  </span>
                </div>
                <div className="p-3.5 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-3)] block uppercase tracking-wider">
                    POSITION
                  </span>
                  <span className="text-[var(--text-1)] font-semibold mt-1 block">
                    34.0169° N, 118.6631° W
                  </span>
                </div>
                <div className="p-3.5 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-3)] block uppercase tracking-wider">
                    CONFIGURATION
                  </span>
                  <span className="text-[var(--violet-300)] font-semibold mt-1 block">
                    Delayed · Borda · Forward-fit
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Button
                    variant="primary"
                    size="md"
                    withArrow
                    onClick={handleStartInvestigation}
                  >
                    Start Investigation
                  </Button>

                  <button
                    onClick={() => setIsCliOpen(true)}
                    className="font-mono text-xs text-[var(--violet-300)] hover:text-white flex items-center gap-2 transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    <Terminal className="w-3.5 h-3.5 text-[var(--violet-400)]" />
                    <span>View CLI command</span>
                  </button>
                </div>
                <p className="font-mono text-xs text-[var(--text-disabled)] tracking-wider">
                  No account or credentials required · Read-only investigation sandbox
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Procedural SAR mini-preview (5 cols) */}
            <div className="lg:col-span-5 relative">
              <div className="rounded-[10px] overflow-hidden border border-[var(--border-default)] bg-[var(--bg-void)] shadow-2xl relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-[260px] object-cover"
                />

                {/* Overlaid Micro Labels */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-1)]/90 border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-2)] uppercase">
                    Sentinel-1 IW · σ°
                  </span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-1)]/90 border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-3)] tabular-nums">
                    34.02° N, 118.66° W
                  </span>
                </div>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* CLI Command Modal */}
      <CliModal isOpen={isCliOpen} onClose={() => setIsCliOpen(false)} />
    </section>
  );
};
