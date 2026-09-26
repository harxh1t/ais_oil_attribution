import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Anchor, CheckCircle2 } from 'lucide-react';
import { useCase } from '../../context/CaseContext';
import { Card, Button } from '../ui';
import { ConfidenceGauge } from './ConfidenceGauge';

export const VerdictCard: React.FC = () => {
  const { caseData, scenarioScoreDelta } = useCase();
  const navigate = useNavigate();

  const leadVessel = caseData.vessels[0];
  const runnerUp = caseData.vessels[1];
  const marginPts = leadVessel.borda - runnerUp.borda;

  return (
    <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-6 shadow-2xl relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-[var(--surface-2)] border border-[var(--violet-400)]/40 flex items-center justify-center text-[var(--violet-400)]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-[var(--text-1)] uppercase tracking-wider">
              FORENSIC ATTRIBUTION VERDICT
            </h2>
            <p className="font-mono text-xs text-[var(--text-3)]">
              Multi-criteria Borda consensus across hydrodynamics, kinematics, and transponder continuity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)] border border-[var(--border-strong)] px-2.5 py-1 rounded-[4px] bg-[var(--surface-2)]">
            EVIDENCE-WEIGHTED CONSENSUS
          </span>
        </div>
      </div>

      {/* Main Grid: Info + Gauge + Action */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6 items-center pt-5">
        {/* Left Column: Lead Identification & Serif Rationale */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Anchor className="w-5 h-5 text-[var(--violet-400)]" />
              <span className="font-display font-bold text-2xl text-[var(--text-1)]">
                {leadVessel.name}
              </span>
            </div>
            <span className="font-mono text-xs text-[var(--text-3)]">
              MMSI: <span className="text-[var(--text-1)] font-semibold">{leadVessel.mmsi}</span>
            </span>
            <span className="font-sans text-xs px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-2)]">
              {leadVessel.type} · {leadVessel.flag}
            </span>
            <span className="font-mono text-xs font-bold text-[var(--violet-400)] border border-[var(--violet-400)]/40 px-2 py-0.5 rounded-[4px] bg-[var(--violet-950)]/30">
              RANK #1 · BORDA {leadVessel.borda}/20
            </span>
          </div>

          {/* Source Serif 4 Rationale Paragraph */}
          <div className="font-serif text-[15px] sm:text-[16px] text-[var(--text-2)] leading-relaxed space-y-2 border-l-2 border-[var(--violet-500)] pl-4 py-1">
            <p>
              <strong className="text-[var(--text-1)] font-sans">{leadVessel.name}</strong> leads on distance at closest point of approach (DCPA {leadVessel.dcpa.toFixed(1)} km) and Fréchet trajectory alignment ({leadVessel.frechet.toFixed(1)} km), while ranking second on temporal offset (|TCPA| {leadVessel.tcpa} min) and broadcast integrity ({leadVessel.continuity}% observed AIS continuity), yielding an aggregate Borda score of {leadVessel.borda}/20. The ranking is sensitive to the release-epoch estimate: see Sensitivity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--text-3)] pt-1">
            <span className="flex items-center gap-1.5 text-[var(--text-2)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--violet-400)]" />
              <span>Attribution Lead verified against 100-minute critical window</span>
            </span>
            <span>·</span>
            <span>
              Margin: <strong className="text-[var(--text-1)]">+{marginPts} pts</strong> over {runnerUp.name}
            </span>
          </div>
        </div>

        {/* Right Column: Animated Confidence Gauge & Open in 3D Button */}
        <div className="flex flex-col items-center justify-center p-4 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[8px] space-y-4">
          <ConfidenceGauge
            value={0.74}
            label="MODERATE-HIGH"
            marginText={`+${marginPts} over ${runnerUp.name}`}
          />

          <Button
            variant="primary"
            size="md"
            className="w-full text-xs"
            onClick={() => navigate('/3d')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            OPEN IN 3D →
          </Button>
        </div>
      </div>
    </Card>
  );
};
