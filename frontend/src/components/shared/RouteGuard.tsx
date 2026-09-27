import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../../context/CaseContext';
import { Button, Card } from '../ui';
import { AlertCircle, Play, ArrowLeft } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { runStatus, loadExample } = useCase();
  const navigate = useNavigate();

  const isDone = runStatus === 'done' || runStatus === 'completed';

  if (!isDone) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-8 text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border-strong)] flex items-center justify-center mx-auto text-[var(--violet-400)]">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--text-1)]">
              Run the investigation first
            </h2>
            <p className="font-sans text-sm text-[var(--text-2)] max-w-md mx-auto">
              This case report requires hindcast advection and kinematic correlation to be calculated before viewing attribution evidence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => navigate('/investigate')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Go to Investigation
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                loadExample();
              }}
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              Load example and skip the run
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
