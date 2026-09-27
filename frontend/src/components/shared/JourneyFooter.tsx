import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCase } from '../../context/CaseContext';
import { Button } from '../ui';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

export const JourneyFooter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { runStatus } = useCase();

  if (location.pathname === '/investigate') {
    const isDone = runStatus === 'done' || runStatus === 'completed';
    return (
      <div className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-8 rounded-[8px] shadow-xl">
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate('/')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          ← BACK TO OVERVIEW
        </Button>

        <div className="relative group">
          <Button
            variant="primary"
            size="md"
            disabled={!isDone}
            onClick={() => navigate('/report')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            CONTINUE TO CASE REPORT →
          </Button>
          {!isDone && (
            <div className="absolute bottom-full mb-2 right-0 bg-[var(--surface-2)] border border-[var(--border-strong)] text-[var(--text-2)] font-mono text-xs px-2.5 py-1 rounded-[4px] shadow-lg whitespace-nowrap pointer-events-none">
              Run the investigation first
            </div>
          )}
        </div>
      </div>
    );
  }

  if (location.pathname === '/report') {
    return (
      <div className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-8 rounded-[8px] shadow-xl">
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate('/investigate')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          ← BACK TO INVESTIGATION
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/workspace')}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          CONTINUE TO 3D WORKSPACE →
        </Button>
      </div>
    );
  }

  if (location.pathname === '/workspace') {
    return (
      <div className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 rounded-[8px] shadow-xl">
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate('/report')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          ← BACK TO CASE REPORT
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/')}
          icon={<Check className="w-4 h-4" />}
        >
          FINISH INVESTIGATION
        </Button>
      </div>
    );
  }

  return null;
};
