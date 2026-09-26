import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const STEPS = [
  { step: 1, path: '/', name: 'Briefing' },
  { step: 2, path: '/investigate', name: 'Investigation' },
  { step: 3, path: '/report', name: 'Case Report' },
  { step: 4, path: '/workspace', name: '3D Workspace' },
];

export const JourneyStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentIdx = STEPS.findIndex((s) => s.path === location.pathname);
  const currentStep = currentIdx >= 0 ? STEPS[currentIdx] : STEPS[1];

  return (
    <div className="flex items-center gap-3 font-mono text-[13px] text-[var(--text-3)] select-none">
      <span className="text-[var(--text-2)] whitespace-nowrap">
        Step <strong className="text-[var(--text-1)] font-semibold">{currentStep.step}</strong> of 4
        <span className="hidden sm:inline"> · <span className="text-[var(--text-1)] font-medium">{currentStep.name}</span></span>
      </span>
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => {
          const isCurrent = s.path === location.pathname;
          const isPast = idx < currentIdx;

          return (
            <button
              key={s.step}
              type="button"
              disabled={!isPast && !isCurrent}
              onClick={() => isPast && navigate(s.path)}
              title={`${s.step}. ${s.name}`}
              className={`w-[10px] h-[10px] rounded-full transition-all focus:outline-none ${
                isCurrent
                  ? 'bg-[var(--violet-500)] ring-2 ring-[var(--violet-400)]/40 scale-110'
                  : isPast
                  ? 'bg-[var(--violet-400)]/80 hover:bg-[var(--violet-300)] cursor-pointer'
                  : 'bg-[var(--surface-3)] border border-[var(--border-subtle)] cursor-not-allowed opacity-50'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
