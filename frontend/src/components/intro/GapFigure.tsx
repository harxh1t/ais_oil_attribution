import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { renderSar } from '../../utils/sarTexture';

export const GapFigure: React.FC = () => {
  const [tRatio, setTRatio] = useState(1.0); // 0.0 = T-9.2h, 1.0 = T-0
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasAutoplayed = useRef(false);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const togglePlay = () => {
    setIsPlaying((prev) => {
      const willPlay = !prev;
      if (willPlay && tRatio >= 1.0) {
        setTRatio(0.0);
      }
      return willPlay;
    });
  };

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const duration = 2800; // 2.8s for smooth forward simulation

    const step = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setTRatio((prev) => {
        const next = prev + dt / duration;
        if (next >= 1.0) {
          setIsPlaying(false);
          return 1.0;
        }
        return next;
      });

      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [isPlaying]);

  // Autoplay scrubber once when in view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAutoplayed.current) {
          hasAutoplayed.current = true;
          setTRatio(0.0);
          setIsPlaying(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render background SAR texture and SVG elements
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = (canvas.width = canvas.parentElement?.clientWidth || 500);
    const h = (canvas.height = 300);

    const sarCanvas = renderSar({
      w,
      h,
      seed: 999,
      calibrated: true,
      slick: false,
    });
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(sarCanvas, 0, 0);
    }
  }, []);

  // Coordinates
  // Point A (T-9.2h Inferred release): left side
  const ax = 120;
  const ay = 175;
  // Point B (T-0 SAR observation): right side
  const bx = 380;
  const by = 115;

  // Current slick position interpolated by tRatio
  const currentX = ax + (bx - ax) * tRatio;
  const currentY = ay + (by - ay) * tRatio;
  const currentRadiusX = 20 + 38 * tRatio;
  const currentRadiusY = 10 + 15 * tRatio;

  // Metrics update with scrubber
  const currentOffset = (9.2 * (1 - tRatio)).toFixed(1);
  const currentDisplacement = (6.4 * tRatio).toFixed(1);
  const dcpaDist = (1.8 + (1 - tRatio) * 0.4).toFixed(1);

  return (
    <div
      ref={containerRef}
      className="bg-[#0E0B1F] border border-[rgba(167,139,250,0.25)] rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-4"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[rgba(167,139,250,0.15)] pb-3">
        <span className="font-mono text-xs font-bold text-[#F4F2FF] uppercase tracking-wide">
          SPATIAL ATTRIBUTION MATRIX
        </span>
        <span className="font-mono text-xs text-[#A78BFA] bg-[#151230] px-2.5 py-0.5 rounded border border-[rgba(167,139,250,0.2)]">
          SIMULATION STEP: T−{(9.2 * (1 - tRatio)).toFixed(1)} h
        </span>
      </div>

      {/* Interactive SVG Scene over Procedural SAR Texture */}
      <div className="relative w-full h-[280px] rounded-xl overflow-hidden bg-[#070512]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 280">
          {/* Faint vessel track passing near Point A */}
          <path
            d="M 60,70 L 140,210 L 220,270"
            stroke="rgba(45, 212, 191, 0.4)"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Closest Approach indicator at Point A */}
          <line
            x1="120"
            y1="175"
            x2="135"
            y2="195"
            stroke="#C4B5FD"
            strokeWidth="1.2"
            strokeDasharray="2,2"
          />

          {/* Drift vector path */}
          <path
            d={`M ${ax},${ay} Q 240,160 ${bx},${by}`}
            stroke="#F472B6"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            fill="none"
          />

          {/* Drifting Slick Polygon (transforms from A to B) */}
          <ellipse
            cx={currentX}
            cy={currentY}
            rx={currentRadiusX}
            ry={currentRadiusY}
            transform={`rotate(-12 ${currentX} ${currentY})`}
            fill="rgba(45, 212, 191, 0.22)"
            stroke="#2DD4BF"
            strokeWidth="2"
          />

          {/* POINT A: Inferred Release (Pink dotted) */}
          <circle
            cx={ax}
            cy={ay}
            r="14"
            fill="none"
            stroke="#F472B6"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <circle cx={ax} cy={ay} r="4" fill="#F472B6" />
          <text
            x={ax - 10}
            y={ay - 22}
            fill="#F472B6"
            fontSize="12"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="bold"
          >
            POINT A · T−9.2 h
          </text>
          <text
            x={ax - 10}
            y={ay - 8}
            fill="#C0BCDB"
            fontSize="12"
            fontFamily="'Inter', sans-serif"
          >
            Inferred release
          </text>

          {/* POINT B: SAR Observation (Teal solid) */}
          <circle
            cx={bx}
            cy={by}
            r="14"
            fill="none"
            stroke="#2DD4BF"
            strokeWidth="2"
          />
          <circle cx={bx} cy={by} r="4" fill="#2DD4BF" />
          <text
            x={bx - 40}
            y={by - 22}
            fill="#2DD4BF"
            fontSize="12"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="bold"
          >
            POINT B · T−0
          </text>
          <text
            x={bx - 40}
            y={by - 8}
            fill="#C0BCDB"
            fontSize="12"
            fontFamily="'Inter', sans-serif"
          >
            SAR observation
          </text>
        </svg>

        {/* Scrubber slider & Play control */}
        <div className="absolute bottom-2 left-3 right-3 bg-[#0E0B1F]/90 border border-[rgba(167,139,250,0.25)] rounded px-2.5 py-1.5 flex items-center gap-2.5 backdrop-blur-md">
          {/* Play / Pause / Replay Button */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause simulation' : tRatio >= 1.0 ? 'Replay simulation' : 'Play simulation'}
            title={isPlaying ? 'Pause simulation' : tRatio >= 1.0 ? 'Replay simulation' : 'Play simulation'}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : tRatio >= 1.0 ? (
              <RotateCcw className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <span className="font-mono text-xs text-[#F472B6] whitespace-nowrap">
            T−9.2 h
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tRatio}
            onChange={(e) => {
              setIsPlaying(false);
              setTRatio(parseFloat(e.target.value));
            }}
            className="flex-1 accent-[#7C3AED] cursor-pointer"
          />
          <span className="font-mono text-xs text-[#2DD4BF] whitespace-nowrap">
            T−0 (SAR)
          </span>
        </div>
      </div>

      {/* Three Metric Tiles */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="p-2.5 bg-[#070512] rounded-lg border border-[rgba(167,139,250,0.15)]">
          <span className="text-xs text-[#9691B3] block">TEMPORAL OFFSET</span>
          <span className="text-sm font-bold text-[#F4F2FF] mt-0.5 block">
            {currentOffset} h
          </span>
        </div>
        <div className="p-2.5 bg-[#070512] rounded-lg border border-[rgba(167,139,250,0.15)]">
          <span className="text-xs text-[#9691B3] block">DRIFT DISPLACEMENT</span>
          <span className="text-sm font-bold text-[#FBBF24] mt-0.5 block">
            {currentDisplacement} km
          </span>
        </div>
        <div className="p-2.5 bg-[#070512] rounded-lg border border-[rgba(167,139,250,0.15)]">
          <span className="text-xs text-[#9691B3] block">LEAD DCPA</span>
          <span className="text-sm font-bold text-[#2DD4BF] mt-0.5 block">
            {dcpaDist} km
          </span>
        </div>
      </div>

      <div className="text-xs font-sans text-[#9691B3] text-center">
        Malibu example · Simulated demonstration data
      </div>
    </div>
  );
};
