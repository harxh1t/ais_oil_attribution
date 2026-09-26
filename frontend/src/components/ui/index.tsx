/**
 * Atomic UI Component Library for WAKE Forensic Maritime Instrument
 * Strictly adheres to the Visual System tokens (src/styles/tokens.css)
 * 
 * Shared Components:
 * - ChapterHeader
 * - Figure
 * - Readout
 * - GlowCard
 * - Stat
 * - Button
 * - Badge
 * - Card
 * - Input, Slider, Toggle, Progress, EvidenceLegend
 */

import React from 'react';
import { cn } from '../../utils/cn';
import { ArrowRight } from 'lucide-react';

// CHAPTER HEADER COMPONENT
export interface ChapterHeaderProps {
  number: string; // e.g. "01", "02", "03", "04"
  eyebrow: string; // e.g. "FORENSIC ATTRIBUTION PIPELINE"
  title: string; // e.g. "From SAR backscatter to candidate attribution."
  className?: string;
  glow?: boolean;
}

export const ChapterHeader: React.FC<ChapterHeaderProps> = ({
  number,
  eyebrow,
  title,
  className,
  glow = true,
}) => {
  return (
    <div className={cn('relative space-y-4 select-none', className)}>
      {/* Very faint violet radial glow behind chapter header (<= 12% alpha) */}
      {glow && (
        <div
          className="absolute -top-10 -left-12 w-[480px] h-[240px] pointer-events-none rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(ellipse at center, var(--violet-500), transparent 70%)' }}
        />
      )}

      {/* Row with Numeral + Hairline */}
      <div className="flex items-center gap-6 w-full">
        <span className="font-display font-bold text-5xl sm:text-7xl lg:text-[96px] leading-none text-[var(--text-1)] tracking-tight shrink-0">
          {number}
        </span>
        <div className="flex-1 h-[1px] bg-[var(--border-default)] self-center" />
      </div>

      {/* Eyebrow and H2 */}
      <div className="space-y-2">
        <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--violet-400)] font-medium">
          {eyebrow}
        </div>
        <h2 className="font-display font-semibold text-3xl sm:text-4xl lg:text-5xl text-[var(--text-1)] tracking-[-0.03em] max-w-[22ch] leading-[1.12]">
          {title}
        </h2>
      </div>
    </div>
  );
};

// FIGURE COMPONENT
export interface FigureProps {
  label: string; // e.g. "FIGURE 1.3"
  title: string; // e.g. "Lagrangian Particle Dispersion"
  tag?: string; // e.g. "SIMULATED · ILLUSTRATIVE"
  caption?: string; // e.g. "Advection solved backwards over 9.2 hours..."
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  evidenceClass?: 'observed' | 'derived' | 'inferred';
  children: React.ReactNode;
  className?: string;
}

export const Figure: React.FC<FigureProps> = ({
  label,
  title,
  tag = 'SIMULATED · ILLUSTRATIVE',
  caption,
  borderStyle = 'solid',
  evidenceClass,
  children,
  className,
}) => {
  // Border style matches evidence class if provided
  let bStyle = 'border-solid border-[var(--border-default)]';
  if (evidenceClass === 'observed' || borderStyle === 'solid') {
    bStyle = 'border-solid border-[var(--observed)]/40';
  } else if (evidenceClass === 'derived' || borderStyle === 'dashed') {
    bStyle = 'border-dashed border-[var(--derived)]/40';
  } else if (evidenceClass === 'inferred' || borderStyle === 'dotted') {
    bStyle = 'border-dotted border-[var(--inferred)]/40';
  }

  return (
    <figure
      className={cn(
        'w-full bg-[var(--surface-1)] border rounded-[10px] overflow-hidden flex flex-col',
        bStyle,
        className
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[var(--violet-400)] tracking-wide">
            {label}
          </span>
          <span className="text-[var(--border-default)]">·</span>
          <span className="font-sans font-semibold text-[var(--text-1)]">{title}</span>
        </div>
        {tag && (
          <span className="font-mono text-xs text-[var(--text-3)] uppercase tracking-wider">
            {tag}
          </span>
        )}
      </div>

      {/* Figure Body */}
      <div className="relative w-full flex-1 min-h-[220px] bg-[var(--bg-void)]">
        {children}
      </div>

      {/* Footer Serif Caption */}
      {caption && (
        <figcaption className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-1)]">
          <p className="font-serif text-[15px] leading-relaxed text-[var(--text-2)] italic">
            {caption}
          </p>
        </figcaption>
      )}
    </figure>
  );
};

// READOUT KEY/VALUE COMPONENT
export interface ReadoutRow {
  key: string;
  value: React.ReactNode;
  hint?: string;
}

export interface ReadoutProps {
  rows: ReadoutRow[];
  className?: string;
}

export const Readout: React.FC<ReadoutProps> = ({ rows, className }) => {
  return (
    <div className={cn('w-full divide-y divide-[var(--border-subtle)]', className)}>
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="py-2.5 flex items-center justify-between gap-4 font-mono text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-[12px] uppercase text-[var(--text-3)] tracking-wider">
              {row.key}
            </span>
            {row.hint && (
              <span className="text-xs text-[var(--text-disabled)] font-sans">
                ({row.hint})
              </span>
            )}
          </div>
          <span className="text-[14px] text-[var(--text-1)] font-medium tabular-nums text-right">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// GLOW CARD COMPONENT
export const GlowCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  style,
  ...props
}) => {
  return (
    <div
      className={cn(
        'relative border border-[var(--border-default)] rounded-[12px] p-6 overflow-hidden shadow-2xl backdrop-blur-md',
        className
      )}
      style={{
        background:
          'radial-gradient(120% 90% at 100% 100%, var(--glow-violet), transparent 60%), radial-gradient(90% 70% at 0% 100%, var(--glow-wine), transparent 55%), var(--surface-1)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// STAT COMPONENT
export interface StatProps {
  number: React.ReactNode;
  label: string;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({ number, label, className }) => {
  return (
    <div
      className={cn(
        'border-l-2 border-[var(--violet-500)] pl-4 py-1 space-y-0.5 select-none',
        className
      )}
    >
      <div className="font-display font-bold text-4xl sm:text-[48px] leading-tight text-[var(--text-1)] tabular-nums">
        {number}
      </div>
      <div className="font-mono text-xs uppercase tracking-wider text-[var(--text-3)] font-medium">
        {label}
      </div>
    </div>
  );
};

// BUTTON COMPONENT
// Rectangular, radius 4px, height 44px, padding 0 20px, JetBrains Mono 13px UPPERCASE, letter-spacing .06em
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  withArrow?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      icon,
      withArrow,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-mono text-[13px] uppercase tracking-[0.06em] rounded-[4px] h-[44px] px-5 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet-300)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-void)]';

    const variants = {
      primary:
        'bg-[var(--gradient-primary)] text-white font-semibold hover:brightness-110 shadow-[0_0_16px_var(--glow-violet)] hover:shadow-[0_0_24px_rgba(79,44,255,0.5)] border border-[var(--violet-400)]/30',
      secondary:
        'bg-transparent border border-[var(--border-default)] text-[var(--text-1)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]',
      ghost:
        'bg-transparent text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] border border-transparent',
      outline:
        'bg-transparent border border-[var(--violet-400)]/40 text-[var(--violet-300)] hover:bg-[var(--surface-2)] hover:border-[var(--violet-400)]',
      danger:
        'bg-[var(--danger)]/15 border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/25',
    };

    const sizes = {
      sm: 'h-[36px] px-3.5 text-xs',
      md: 'h-[44px] px-5 text-[13px]',
      lg: 'h-[48px] px-6 text-[14px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {icon && <span className="mr-2 shrink-0">{icon}</span>}
        <span>{children}</span>
        {withArrow && (
          <ArrowRight className="w-4 h-4 ml-2 shrink-0 transition-transform duration-200 group-hover:translate-x-[3px]" />
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

// BADGE COMPONENT
// Radius 4px, mono 12px UPPERCASE, 1px border; evidence badges use border style solid/dashed/dotted plus their color
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'observed'
    | 'derived'
    | 'derived-external'
    | 'inferred'
    | 'neutral'
    | 'model-param'
    | 'success'
    | 'warning'
    | 'danger';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center font-mono font-medium uppercase tracking-[0.06em] rounded-[4px] shrink-0 whitespace-nowrap select-none text-[12px]';

  const variants = {
    observed:
      'bg-[var(--observed)]/10 text-[var(--observed)] border border-solid border-[var(--observed)]/60',
    derived:
      'bg-[var(--derived)]/10 text-[var(--derived)] border border-dashed border-[var(--derived)]/60',
    'derived-external':
      'bg-[var(--derived)]/10 text-[var(--derived)] border border-dashed border-[var(--derived)]/60',
    inferred:
      'bg-[var(--inferred)]/10 text-[var(--inferred)] border border-dotted border-[var(--inferred)]/70',
    neutral:
      'bg-[var(--surface-2)] text-[var(--text-3)] border border-solid border-[var(--border-default)]',
    'model-param':
      'bg-[var(--surface-2)] text-[var(--text-3)] border border-solid border-[var(--border-default)]',
    success:
      'bg-[var(--success)]/10 text-[var(--success)] border border-solid border-[var(--success)]/50',
    warning:
      'bg-[var(--warning)]/10 text-[var(--warning)] border border-solid border-[var(--warning)]/50',
    danger:
      'bg-[var(--danger)]/10 text-[var(--danger)] border border-solid border-[var(--danger)]/50',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
};

// STANDARD CARD COMPONENT
// surface-1, 1px border-default, radius 10
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] p-5 shadow-xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// INPUT COMPONENT
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  unit?: string;
  helperText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, unit, helperText, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <div className="flex justify-between items-center text-xs font-sans text-[var(--text-3)]">
            <span>{label}</span>
            {unit && <span className="font-mono text-[var(--violet-400)]">{unit}</span>}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              'w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[4px] px-3.5 py-2.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-disabled)]',
              'focus:outline-none focus:border-[var(--violet-400)] focus:ring-2 focus:ring-[var(--violet-500)]/30 transition-all',
              error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/30',
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-[var(--danger)] font-sans">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[var(--text-3)] font-sans">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

// SLIDER COMPONENT
export interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  onChange: (val: number) => void;
  provenanceBadge?: React.ReactNode;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  unit = '',
  onChange,
  provenanceBadge,
}) => {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          {label && <span className="font-sans text-[var(--text-1)]">{label}</span>}
          {provenanceBadge}
        </div>
        <span className="font-mono text-[var(--text-1)] font-semibold tabular-nums">
          {value} {unit}
        </span>
      </div>
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            background: `linear-gradient(to right, var(--violet-500) 0%, var(--violet-500) ${percentage}%, var(--surface-3) ${percentage}%, var(--surface-3) 100%)`,
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet-300)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--violet-500)] [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--glow-violet)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--violet-500)] [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-xs font-mono text-[var(--text-3)]">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
};

// TOGGLE SWITCH COMPONENT
export interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, description }) => {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer group select-none">
      {(label || description) && (
        <div className="space-y-0.5">
          {label && (
            <span className="text-xs font-sans font-medium text-[var(--text-1)] group-hover:text-white transition-colors">
              {label}
            </span>
          )}
          {description && <p className="text-xs font-sans text-[var(--text-3)]">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'w-9 h-5 flex items-center rounded-full p-0.5 transition-colors shrink-0 duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet-300)]',
          checked ? 'bg-[var(--violet-500)]' : 'bg-[var(--surface-3)] border border-[var(--border-default)]'
        )}
      >
        <div
          className={cn(
            'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </label>
  );
};

// PROGRESS BAR COMPONENT
export interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  color?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  label,
  color = 'bg-[var(--violet-500)]',
}) => {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex justify-between items-center text-xs">
          <span className="font-sans text-[var(--text-3)]">{label}</span>
          <span className="font-mono text-[var(--text-1)] tabular-nums">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
        <div
          className={cn('h-full transition-all duration-300 rounded-full', color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

// EVIDENCE LEGEND COMPONENT
export const EvidenceLegend: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 text-xs font-sans bg-[var(--surface-1)] border border-[var(--border-default)] px-3 rounded-[4px] whitespace-nowrap select-none',
        compact ? 'py-1' : 'py-1.5'
      )}
    >
      {/* OBSERVED */}
      <div
        className="flex items-center gap-2 cursor-help"
        title="Observed: Raw Sentinel-1 SAR imagery pixels, detected slick outline, raw AIS broadcasts"
      >
        <span className="w-6 h-0.5 bg-[var(--observed)] rounded-full shrink-0" />
        <span className="text-[var(--observed)] font-medium font-sans">Observed</span>
      </div>

      {/* DERIVED */}
      <div
        className="flex items-center gap-2 cursor-help"
        title="Derived: Interpolated/reconstructed track segments, DCPA, TCPA, Fréchet distance, AIS continuity, and external model forcing fields (GFS winds, HYCOM currents)"
      >
        <span className="w-6 h-0.5 border-t-2 border-dashed border-[var(--derived)] shrink-0" />
        <span className="text-[var(--derived)] font-medium font-sans">Derived</span>
      </div>

      {/* INFERRED */}
      <div
        className="flex items-center gap-2 cursor-help"
        title="Inferred: OpenDrift Lagrangian hindcast particles, release-point error ellipse, Borda ranking and confidence"
      >
        <span className="w-6 h-0.5 border-t-2 border-dotted border-[var(--inferred)] shrink-0" />
        <span className="text-[var(--inferred)] font-medium font-sans">Inferred</span>
      </div>
    </div>
  );
};
