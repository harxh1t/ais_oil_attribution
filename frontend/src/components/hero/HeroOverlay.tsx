import React, { useEffect, useRef, useState } from 'react';

export const HeroOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTag, setActiveTag] = useState<string>('T+0 · SAR OBSERVATION');
  const [tagPos, setTagPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId: number;
    let isVisible = true;
    let startTime = performance.now();

    const handleResize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // Hindcast particles streaming BACKWARDS (east to west)
    const particleCount = 75;
    const particles = Array.from({ length: particleCount }, () => ({
      progress: Math.random(),
      offsetY: (Math.random() - 0.5) * 28,
      speed: 0.15 + Math.random() * 0.15,
      size: 1.0 + Math.random() * 1.5,
    }));

    const render = (now: number) => {
      if (!isVisible) {
        animId = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 16-second loop
      const elapsedSec = prefersReducedMotion ? 11.0 : ((now - startTime) / 1000) % 16.0;

      // Positions on the right side of the screen
      const slickX = w * 0.72;
      const slickY = h * 0.54;
      const originX = w * 0.46;
      const originY = h * 0.58;

      // 1. Graticule and Sentinel-1 IW swath boundary
      ctx.save();
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.12)';
      ctx.lineWidth = 1;

      // Latitude grid
      ctx.beginPath();
      ctx.moveTo(0, h * 0.35);
      ctx.lineTo(w, h * 0.35);
      ctx.moveTo(0, h * 0.70);
      ctx.lineTo(w, h * 0.70);
      ctx.stroke();

      // Longitude grid
      ctx.beginPath();
      ctx.moveTo(w * 0.40, 0);
      ctx.lineTo(w * 0.40, h);
      ctx.moveTo(w * 0.75, 0);
      ctx.lineTo(w * 0.75, h);
      ctx.stroke();

      // Graticule tick labels (>= 4.5:1 text contrast)
      ctx.fillStyle = '#9691B3';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('34°02\'N', 12, h * 0.35 - 4);
      ctx.fillText('34°00\'N', 12, h * 0.70 - 4);
      ctx.fillText('118°44\'W', w * 0.40 + 4, 18);
      ctx.fillText('118°38\'W', w * 0.75 + 4, 18);

      // Sentinel-1 IW Slanted Swath Edge
      ctx.beginPath();
      ctx.moveTo(w * 0.30, 0);
      ctx.lineTo(w * 0.88, h);
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.22)';
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Determine Story Phase
      // Phase 1: 0 - 4s
      // Phase 2: 4 - 9s
      // Phase 3: 9 - 13s
      // Phase 4: 13 - 16s (fade out)
      let globalAlpha = 1.0;
      if (elapsedSec > 13.0) {
        globalAlpha = Math.max(0, 1.0 - (elapsedSec - 13.0) / 3.0);
      }

      ctx.save();
      ctx.globalAlpha = globalAlpha;

      // PHASE 1+: Draw Slick Outline (OBSERVED: Teal solid)
      const p1Alpha = Math.min(1.0, elapsedSec / 1.5);
      if (elapsedSec >= 0) {
        ctx.save();
        ctx.globalAlpha = globalAlpha * p1Alpha;
        ctx.strokeStyle = '#2DD4BF'; // Observed teal
        ctx.lineWidth = 2.0;

        ctx.beginPath();
        const slickPts = [
          { x: -55, y: -10 },
          { x: -25, y: -20 },
          { x: 15, y: -18 },
          { x: 50, y: -8 },
          { x: 65, y: 5 },
          { x: 38, y: 18 },
          { x: 0, y: 22 },
          { x: -35, y: 12 },
        ];
        slickPts.forEach((pt, idx) => {
          const px = slickX + pt.x;
          const py = slickY + pt.y;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.stroke();

        // Observation Centroid dot
        ctx.fillStyle = '#2DD4BF';
        ctx.beginPath();
        ctx.arc(slickX, slickY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // PHASE 2+: Inferred Hindcast Particles & Origin Ellipse (INFERRED: Pink dotted)
      if (elapsedSec >= 4.0) {
        const p2Alpha = Math.min(1.0, (elapsedSec - 4.0) / 1.5);
        ctx.save();
        ctx.globalAlpha = globalAlpha * p2Alpha;

        // Draw Inferred Release Origin Point
        ctx.fillStyle = '#F472B6';
        ctx.beginPath();
        ctx.arc(originX, originY, 4.0, 0, Math.PI * 2);
        ctx.fill();

        // Pink Dotted 95% Error Ellipse
        ctx.strokeStyle = '#F472B6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.ellipse(originX, originY, 44, 24, 0.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Stream particles from Slick to Origin (backwards drift)
        particles.forEach((p) => {
          p.progress = (p.progress + 0.006 * p.speed) % 1.0;
          const t = p.progress;
          // Interpolate from slick to origin
          const px = slickX + (originX - slickX) * t;
          const py = slickY + (originY - slickY) * t + Math.sin(t * Math.PI) * p.offsetY;

          ctx.fillStyle = `rgba(244, 114, 182, ${0.4 + (1 - t) * 0.5})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // PHASE 3+: Candidate Vessels & Closest Approach (TEAL solid + AMBER dashed gap)
      if (elapsedSec >= 9.0) {
        const p3Alpha = Math.min(1.0, (elapsedSec - 9.0) / 1.5);
        ctx.save();
        ctx.globalAlpha = globalAlpha * p3Alpha;

        // Vessel 1 (Lead: MV Meridian Crest - Closest Approach)
        const v1Start = { x: w * 0.32, y: h * 0.35 };
        const v1End = { x: w * 0.90, y: h * 0.85 };
        const v1Pos = {
          x: v1Start.x + (v1End.x - v1Start.x) * 0.48,
          y: v1Start.y + (v1End.y - v1Start.y) * 0.48,
        };

        // Solid Teal Track
        ctx.strokeStyle = '#2DD4BF';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(v1Start.x, v1Start.y);
        ctx.lineTo(v1End.x, v1End.y);
        ctx.stroke();

        // Violet Halo on MV Meridian Crest
        const pulse = 16 + Math.sin(now * 0.005) * 3;
        const grad = ctx.createRadialGradient(v1Pos.x, v1Pos.y, 2, v1Pos.x, v1Pos.y, pulse);
        grad.addColorStop(0, 'rgba(196, 181, 253, 0.95)');
        grad.addColorStop(0.45, 'rgba(124, 58, 237, 0.5)');
        grad.addColorStop(1, 'rgba(124, 58, 237, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(v1Pos.x, v1Pos.y, pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(v1Pos.x, v1Pos.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Line of Closest Approach to Origin
        ctx.strokeStyle = '#A78BFA';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(v1Pos.x, v1Pos.y);
        ctx.lineTo(originX, originY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Vessel 2 (MV Pacific Lantern - with AMBER dashed gap)
        const v2Start = { x: w * 0.35, y: h * 0.22 };
        const v2End = { x: w * 0.92, y: h * 0.72 };
        const gap1 = {
          x: v2Start.x + (v2End.x - v2Start.x) * 0.35,
          y: v2Start.y + (v2End.y - v2Start.y) * 0.35,
        };
        const gap2 = {
          x: v2Start.x + (v2End.x - v2Start.x) * 0.65,
          y: v2Start.y + (v2End.y - v2Start.y) * 0.65,
        };

        // Before gap (Observed teal)
        ctx.strokeStyle = '#2DD4BF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(v2Start.x, v2Start.y);
        ctx.lineTo(gap1.x, gap1.y);
        ctx.stroke();

        // Gap (Derived: Amber dashed)
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(gap1.x, gap1.y);
        ctx.lineTo(gap2.x, gap2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // After gap (Observed teal)
        ctx.strokeStyle = '#2DD4BF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(gap2.x, gap2.y);
        ctx.lineTo(v2End.x, v2End.y);
        ctx.stroke();

        // Other background commercial tracks
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(w * 0.42, h * 0.15);
        ctx.lineTo(w * 0.95, h * 0.60);
        ctx.moveTo(w * 0.25, h * 0.48);
        ctx.lineTo(w * 0.82, h * 0.92);
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();

      // Update Phase Label Pill Position
      if (elapsedSec < 4.0) {
        setActiveTag('T+0 · SAR OBSERVATION');
        setTagPos({ x: slickX + 10, y: slickY - 34 });
      } else if (elapsedSec < 9.0) {
        setActiveTag('HINDCAST · −9.2 h');
        setTagPos({ x: originX - 60, y: originY - 38 });
      } else {
        setActiveTag('CLOSEST APPROACH');
        setTagPos({ x: originX + 24, y: originY - 42 });
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render(startTime + 11000);
    } else {
      animId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none z-[1] overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Narrative Phase Pill Tag (Hidden on mobile < 900px, 80% dark background, contrast >= 4.5:1) */}
      <div
        className="hidden min-[900px]:block absolute transition-all duration-300 font-mono text-xs font-semibold text-[#F4F2FF] bg-[#0E0B1F]/85 border border-[#A78BFA]/30 px-2.5 py-1 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md"
        style={{
          transform: `translate(${tagPos.x}px, ${tagPos.y}px)`,
        }}
      >
        <span className="inline-block w-2 h-2 rounded-full bg-[#7C3AED] mr-1.5 animate-pulse" />
        {activeTag}
      </div>
    </div>
  );
};
