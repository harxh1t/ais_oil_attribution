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
      <div className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-8 rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate('/')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Overview
        </Button>

        <div className="relative group">
          <Button
            variant="primary"
            size="md"
            disabled={!isDone}
            onClick={() => navigate('/report')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Continue to Case Report
          </Button>
          {!isDone && (
            <div className="absolute bottom-full mb-2 right-0 bg-[var(--surface-1)] border border-[var(--border-default)] text-[var(--text-2)] font-sans text-xs px-2.5 py-1 rounded-[4px] shadow-md whitespace-nowrap pointer-events-none">
              Run the investigation first
            </div>
          )}
        </div>
      </div>
    );
  }

  if (location.pathname === '/report') {
    return (
      <div className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-8 rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate('/investigate')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Investigation
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/workspace')}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Continue to 3D Workspace
        </Button>
      </div>
    );
  }

  if (location.pathname === '/workspace') {
    return (
      <div className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate('/report')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Case Report
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/')}
          icon={<Check className="w-4 h-4" />}
        >
          Finish Investigation
        </Button>
      </div>
    );
  }

  return null;
};
