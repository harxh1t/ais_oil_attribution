/**
 * Atomic UI Component Library for WAKE
 * Strictly adheres to the Light Design System tokens (src/styles/tokens.css)
 */

import React from 'react';
import { cn } from '../../utils/cn';
import { ArrowRight } from 'lucide-react';

// CHAPTER / SECTION HEADER COMPONENT
// Simplified pattern: small numbered pill ("01") in primary-50 bg + primary-700 text, inline before the eyebrow,
// followed by a plain bold Inter H2 (28-36px, no gradient, no huge numeral, no display font).
export interface ChapterHeaderProps {
  number?: string; // e.g. "01", "02", "03", "04"
  stepNumber?: string;
  eyebrow: string; // e.g. "FORENSIC ATTRIBUTION PIPELINE"
  title: string; // e.g. "From SAR backscatter to candidate attribution."
  description?: string;
  className?: string;
  titleClassName?: string;
  titleStyle?: React.CSSProperties;
  descriptionClassName?: string;
  descriptionStyle?: React.CSSProperties;
  glow?: boolean;
}

export const ChapterHeader: React.FC<ChapterHeaderProps> = ({
  title,
  description,
  className,
  titleClassName,
  titleStyle,
  descriptionClassName,
  descriptionStyle,
}) => {
  return (
    <div className={cn('space-y-2 select-none', className)}>
      <h2
        style={titleStyle}
        className={cn('font-sans font-bold text-2xl sm:text-3xl lg:text-[32px] text-[var(--text-1)] tracking-tight leading-tight', titleClassName)}
      >
        {title}
      </h2>
      {description && (
        <p
          style={descriptionStyle}
          className={cn('text-sm text-[var(--text-2)] max-w-3xl leading-relaxed mt-2', descriptionClassName)}
        >
          {description}
        </p>
      )}
    </div>
  );
};


// FIGURE COMPONENT
// 1px --border-default, radius 6, white background, plain caption below in --text-2 13px ("Fig. N — ...")
export interface FigureProps {
  label: string; // e.g. "Fig. 1" or "FIGURE 1.3"
  title: string; // e.g. "SAR preprocessing"
  tag?: string; // e.g. "SIMULATED · ILLUSTRATIVE"
  caption?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  evidenceClass?: 'observed' | 'derived' | 'inferred';
  children: React.ReactNode;
  className?: string;
}

export const Figure: React.FC<FigureProps> = ({
  label,
  title,
  tag,
  caption,
  borderStyle = 'solid',
  evidenceClass,
  children,
  className,
}) => {
  let bStyle = 'border-solid border-[var(--border-default)]';
  if (evidenceClass === 'observed' || borderStyle === 'solid') {
    bStyle = 'border-solid border-[var(--observed)]/40';
  } else if (evidenceClass === 'derived' || borderStyle === 'dashed') {
    bStyle = 'border-dashed border-[var(--derived)]/50';
  } else if (evidenceClass === 'inferred' || borderStyle === 'dotted') {
    bStyle = 'border-dotted border-[var(--inferred)]/50';
  }

  // Clean label format if it starts with "FIGURE"
  const cleanLabel = label.replace(/^FIGURE\s+/i, 'Fig. ');

  return (
    <figure
      className={cn(
        'w-full bg-[var(--surface-1)] border rounded-[6px] overflow-hidden flex flex-col',
        bStyle,
        className
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-2)] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[var(--primary-600)]">
            {cleanLabel}
          </span>
          <span className="text-[var(--border-default)]">·</span>
          <span className="font-sans font-medium text-[var(--text-1)]">{title}</span>
        </div>
        {tag && (
          <span className="font-mono text-xs text-[var(--text-3)] uppercase tracking-wider">
            {tag}
          </span>
        )}
      </div>

      {/* Figure Body */}
      <div className="relative w-full flex-1 min-h-[220px] bg-white">
        {children}
      </div>

      {/* Footer Caption */}
      {caption && (
        <figcaption className="px-3.5 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface-1)] text-[13px] text-[var(--text-2)] leading-relaxed">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

// READOUT KEY/VALUE COMPONENT
export interface ReadoutRow {
  key?: string;
  value: React.ReactNode;
  hint?: string;
  label?: string;
  sub?: string;
}

export interface ReadoutProps {
  rows?: ReadoutRow[];
  label?: string;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}

export const Readout: React.FC<ReadoutProps> = ({ rows, label, value, sub, className }) => {
  if (label !== undefined && value !== undefined) {
    return (
      <div className={cn('p-3 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border-subtle)]', className)}>
        <div className="text-[10px] font-mono text-[var(--text-3)] uppercase tracking-wider">{label}</div>
        <div className="text-base font-mono font-bold text-[var(--text-1)] mt-0.5">{value}</div>
        {sub && <div className="text-[11px] text-[var(--text-3)] mt-0.5">{sub}</div>}
      </div>
    );
  }

  if (!rows) return null;

  return (
    <div className={cn('w-full divide-y divide-[var(--border-subtle)]', className)}>
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="py-2.5 flex items-center justify-between gap-4 font-mono text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase text-[var(--text-3)] font-medium tracking-wider">
              {row.key || row.label}
            </span>
            {(row.hint || row.sub) && (
              <span className="text-xs text-[var(--text-disabled)] font-sans">
                ({row.hint || row.sub})
              </span>
            )}
          </div>
          <span className="text-xs text-[var(--text-1)] font-medium tabular-nums text-right">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
};


// STANDARD CARD COMPONENT
// white surface, 1px --border-default, radius 8px, NO glow, subtle shadow (0 1px 2px rgba(0,0,0,0.04))
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// GLOW CARD COMPONENT (Plain equivalent: alias to Card with radius 8px, no glow, no radial gradient)
export const GlowCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  style,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        className
      )}
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
        'border-l-2 border-[var(--primary-500)] pl-4 py-1 space-y-0.5 select-none',
        className
      )}
    >
      <div className="font-sans font-bold text-3xl sm:text-4xl text-[var(--text-1)] tabular-nums tracking-tight">
        {number}
      </div>
      <div className="font-mono text-xs uppercase tracking-wider text-[var(--text-3)] font-medium">
        {label}
      </div>
    </div>
  );
};

// BUTTON COMPONENT
// Radius 6px, height 40px (36 sm / 44 lg).
// Primary = solid --primary-600, white text, hover --primary-700, no gradient, no glow.
// Secondary = white background, 1px --border-default, text-1, hover --surface-2.
// Ghost = transparent, text-2, hover --surface-2.
// Focus-visible: 2px --primary-500 ring, 2px offset.
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
      'inline-flex items-center justify-center font-sans font-medium rounded-[6px] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ocean-3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]';

    const variants = {
      primary:
        'bg-[var(--ocean-1)] text-white hover:bg-[var(--ocean-2)] border border-[var(--ocean-1)] shadow-[0_1px_3px_rgba(5,47,70,0.2)]',
      secondary:
        'bg-[var(--ocean-2)] text-white hover:bg-[var(--ocean-1)] border border-[var(--ocean-1)] shadow-[0_1px_2px_rgba(5,47,70,0.15)]',
      ghost:
        'bg-transparent text-[var(--ocean-1)] hover:bg-[var(--ocean-2)] hover:text-white border border-transparent',
      outline:
        'bg-[var(--surface-1)] border-2 border-[var(--ocean-1)] text-[var(--ocean-1)] hover:bg-[var(--ocean-1)] hover:text-white',
      danger:
        'bg-[var(--danger)] text-white hover:opacity-90 border border-transparent shadow-xs',
    };

    const sizes = {
      sm: 'h-[36px] px-3 text-xs',
      md: 'h-[40px] px-4 text-xs sm:text-[13px]',
      lg: 'h-[44px] px-5 text-sm',
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
          <ArrowRight className="w-4 h-4 ml-2 shrink-0 transition-transform duration-150 group-hover:translate-x-[2px]" />
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

// BADGE COMPONENT
// Radius 4px, 1px border, text + icon (not colour alone).
// Evidence badges:
// Observed = solid border + solid dot;
// Derived = dashed border + hollow dot;
// Inferred = dotted border + small triple-dot glyph.
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
  noIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  noIcon = false,
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center gap-1.5 font-mono font-medium rounded-[4px] shrink-0 whitespace-nowrap select-none text-xs';

  const variants = {
    observed:
      'bg-[var(--ocean-2)] text-white border border-solid border-[var(--ocean-1)] shadow-xs',
    derived:
      'bg-[var(--ocean-3)] text-white border border-dashed border-[var(--ocean-1)] shadow-xs',
    'derived-external':
      'bg-[var(--ocean-3)] text-white border border-dashed border-[var(--ocean-1)] shadow-xs',
    inferred:
      'bg-[var(--ocean-1)] text-white border border-dotted border-[var(--ocean-4)] shadow-xs',
    neutral:
      'bg-[var(--ocean-1)] text-white border border-solid border-[var(--ocean-2)] shadow-xs',
    'model-param':
      'bg-[var(--ocean-2)] text-[var(--text-light-subtle)] border border-solid border-[var(--ocean-3)]',
    success:
      'bg-[var(--success)] text-white border border-solid border-[#084831]',
    warning:
      'bg-[var(--warning)] text-white border border-solid border-[#683C02]',
    danger:
      'bg-[var(--danger)] text-white border border-solid border-[#631010]',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  // Icon symbol matching the evidence class requirement:
  // Observed = solid dot; Derived = hollow dot; Inferred = triple dot glyph
  const renderIcon = () => {
    if (noIcon) return null;
    if (variant === 'observed') {
      return <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />;
    }
    if (variant === 'derived' || variant === 'derived-external') {
      return (
        <span className="w-1.5 h-1.5 rounded-full border border-white bg-transparent shrink-0" />
      );
    }
    if (variant === 'inferred') {
      return (
        <span className="text-[10px] leading-none text-white shrink-0 select-none">
          •••
        </span>
      );
    }
    return null;
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {renderIcon()}
      <span>{children}</span>
    </span>
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
          <div className="flex justify-between items-center text-xs font-sans text-[var(--text-3)] font-medium">
            <span>{label}</span>
            {unit && <span className="font-mono text-[var(--ocean-1)] font-semibold">{unit}</span>}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              'w-full bg-[var(--ocean-5-tint)] border border-[var(--border-default)] rounded-[4px] px-3.5 py-2 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-disabled)]',
              'focus:outline-none focus:border-[var(--ocean-2)] focus:ring-2 focus:ring-[var(--ocean-3)]/30 transition-all',
              error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20',
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

// SELECT COMPONENT
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helperText, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <div className="text-xs font-sans text-[var(--text-3)] font-medium">
            {label}
          </div>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full bg-[var(--ocean-5-tint)] border border-[var(--border-default)] rounded-[4px] px-3 py-2 text-xs font-mono text-[var(--text-1)]',
              'focus:outline-none focus:border-[var(--ocean-2)] focus:ring-2 focus:ring-[var(--ocean-3)]/30 transition-all cursor-pointer',
              className
            )}
            {...props}
          >
            {children}
          </select>
        </div>
        {helperText && <p className="text-xs text-[var(--text-3)] font-sans">{helperText}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';


// SLIDER COMPONENT
export interface SliderProps {
  label?: string;
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
    <div className="w-full space-y-1.5">
      {(label || provenanceBadge) && (
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            {label && <span className="font-sans text-[var(--text-1)] font-medium">{label}</span>}
            {provenanceBadge}
          </div>
          <span className="font-mono text-[var(--text-1)] font-semibold tabular-nums">
            {value} {unit}
          </span>
        </div>
      )}
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            background: `linear-gradient(to right, var(--primary-600) 0%, var(--primary-600) ${percentage}%, var(--surface-3) ${percentage}%, var(--surface-3) 100%)`,
          }}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--primary-600)] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.15)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--primary-600)] [&::-moz-range-thumb]:cursor-pointer"
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
            <span className="text-xs font-sans font-medium text-[var(--text-1)] group-hover:text-[var(--primary-700)] transition-colors">
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
          'w-9 h-5 flex items-center rounded-full p-0.5 transition-colors shrink-0 duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]',
          checked ? 'bg-[var(--primary-600)]' : 'bg-[var(--surface-3)] border border-[var(--border-default)]'
        )}
      >
        <div
          className={cn(
            'bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out',
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
  color = 'bg-[var(--primary-600)]',
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
// Shows the three data classes cleanly
export const EvidenceLegend: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 text-xs font-sans bg-[var(--surface-1)] border border-[var(--border-default)] px-3 rounded-[4px] whitespace-nowrap select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
        compact ? 'py-1' : 'py-1.5'
      )}
    >
      {/* OBSERVED */}
      <div
        className="flex items-center gap-2 cursor-help"
        title="Observed: Raw Sentinel-1 SAR imagery pixels, detected slick outline, raw AIS broadcasts"
      >
        <span className="w-5 h-0.5 bg-[var(--observed)] rounded-full shrink-0" />
        <span className="text-[var(--observed)] font-medium font-sans">Observed</span>
      </div>

      {/* DERIVED */}
      <div
        className="flex items-center gap-2 cursor-help"
        title="Derived: Interpolated/reconstructed track segments, DCPA, TCPA, Fréchet distance, AIS continuity, and external model forcing fields (GFS winds, HYCOM currents)"
      >
        <span className="w-5 border-t-2 border-dashed border-[var(--derived)] shrink-0" />
        <span className="text-[var(--derived)] font-medium font-sans">Derived</span>
      </div>

      {/* INFERRED */}
      <div
        className="flex items-center gap-2 cursor-help"
        title="Inferred: OpenDrift Lagrangian hindcast particles, release-point error ellipse, Borda ranking and confidence"
      >
        <span className="w-5 border-t-2 border-dotted border-[var(--inferred)] shrink-0" />
        <span className="text-[var(--inferred)] font-medium font-sans">Inferred</span>
      </div>
    </div>
  );
};

// TABLE COMPONENTS
// Lighter shade for table body with dark text, darker ocean strip for header with light text
export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className="w-full overflow-x-auto rounded-[6px] border border-[var(--border-default)] shadow-xs">
    <table className={cn('w-full text-left border-collapse', className)}>
      {children}
    </table>
  </div>
);

export const Thead: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <thead className={cn('bg-[var(--ocean-2)] border-b border-[var(--ocean-1)] text-white', className)}>
    {children}
  </thead>
);

export const Tbody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <tbody className={cn('divide-y divide-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-1)]', className)}>
    {children}
  </tbody>
);

export const Tr: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <tr
    onClick={onClick}
    className={cn(
      'transition-colors duration-150 ease-in-out hover:bg-[var(--surface-2)] text-[var(--text-1)]',
      onClick && 'cursor-pointer',
      className
    )}
  >
    {children}
  </tr>
);

export const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <th className={cn('px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider text-white', className)}>
    {children}
  </th>
);

export const Td: React.FC<{ children: React.ReactNode; className?: string; colSpan?: number }> = ({ children, className, colSpan }) => (
  <td colSpan={colSpan} className={cn('px-4 py-3 text-sm text-[var(--text-1)] align-middle font-medium', className)}>
    {children}
  </td>
);

