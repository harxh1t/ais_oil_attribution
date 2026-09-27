import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Badge, Card } from '../ui';
import {
  Ship,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export const VesselDossier: React.FC = () => {
  const { selectedVessel } = useCase();

  if (!selectedVessel) return null;

  const isRank1 = selectedVessel.rank === 1;

  return (
    <div className="space-y-4">
      {/* Dossier Header */}
      <div className="p-4 bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-[4px] flex items-center justify-center shrink-0 border',
              isRank1
                ? 'bg-[var(--surface-2)] border-[var(--violet-500)] text-[var(--violet-300)]'
                : 'bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-3)]'
            )}
          >
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-lg text-[var(--text-1)]">
                {selectedVessel.name}
              </h3>
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)] border border-[var(--border-strong)] px-2 py-0.5 rounded-[4px]">
                {isRank1 ? 'Lead Candidate' : `Rank #${selectedVessel.rank} Candidate`}
              </span>
              <Badge variant="inferred" size="sm">
                Confidence: {(selectedVessel.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
            {/* Candidate registry details */}
            <div className="flex items-center gap-3 text-xs text-[var(--text-3)] mt-1 flex-wrap font-mono">
              <span>MMSI: <span className="text-[var(--text-1)] font-semibold">{selectedVessel.mmsi}</span></span>
              <span>•</span>
              <span>FLAG: <span className="text-[var(--text-2)] font-sans">{selectedVessel.flag}</span></span>
              <span>•</span>
              <span>TYPE: <span className="text-[var(--text-2)] font-sans">{selectedVessel.type}</span></span>
              <span>•</span>
              <span>DIMENSIONS: <span className="text-[var(--text-2)]">{selectedVessel.lengthM}m × {selectedVessel.beamM}m</span></span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)]">BORDA SCORE (INFERRED)</div>
          <div className="font-mono font-bold text-2xl text-[var(--text-1)]">
            {selectedVessel.borda}
            <span className="text-sm font-normal text-[var(--text-3)]">/20</span>
          </div>
        </div>
      </div>

      {/* Grid of Analytical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* DCPA */}
        <Card className="bg-[var(--surface-1)] border-[var(--border-default)]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--text-3)] font-mono uppercase tracking-wider">DCPA (Distance)</span>
            <Badge variant="derived" size="sm">Derived</Badge>
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-1)] mt-1">
            {selectedVessel.dcpa.toFixed(1)} km
          </div>
          <div className="text-[var(--text-3)] text-xs font-sans mt-1">
            Closest approach to release point
          </div>
        </Card>

        {/* TCPA */}
        <Card className="bg-[var(--surface-1)] border-[var(--border-default)]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--text-3)] font-mono uppercase tracking-wider">|TCPA| (Time)</span>
            <Badge variant="derived" size="sm">Derived</Badge>
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-1)] mt-1">
            {selectedVessel.tcpa} min
          </div>
          <div className="text-[var(--text-3)] text-xs font-sans mt-1">
            {selectedVessel.tcpaSigned < 0 ? 'Passed ahead of release' : 'Passed after release'}
          </div>
        </Card>

        {/* Fréchet Distance */}
        <Card className="bg-[var(--surface-1)] border-[var(--border-default)]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--text-3)] font-mono uppercase tracking-wider">Fréchet Metric</span>
            <Badge variant="derived" size="sm">Derived</Badge>
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-1)] mt-1">
            {selectedVessel.frechet.toFixed(1)} km
          </div>
          <div className="text-[var(--text-3)] text-xs font-sans mt-1">
            Trajectory curve divergence
          </div>
        </Card>

        {/* AIS Continuity */}
        <Card className="bg-[var(--surface-1)] border-[var(--border-default)]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--text-3)] font-mono uppercase tracking-wider">AIS Continuity</span>
            <Badge variant="derived" size="sm">Derived</Badge>
          </div>
          <div className="text-lg font-bold font-mono text-[var(--text-1)] mt-1">
            {selectedVessel.continuity}%
          </div>
          <div className="text-[var(--text-3)] text-xs font-sans mt-1">
            100-min critical window
          </div>
        </Card>
      </div>

      {/* Contradiction / Anomaly Section */}
      {selectedVessel.contradiction ? (
        <div className="p-4 bg-[var(--surface-2)] border border-[var(--danger)] rounded-[8px] space-y-2">
          <div className="flex items-center gap-2 text-[var(--danger)] font-semibold text-xs font-mono uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>SIGNAL ANOMALY & TEMPORAL CONTRADICTION DETECTED</span>
          </div>
          <p className="text-[var(--text-1)] font-serif text-[15px] leading-relaxed">
            {selectedVessel.contradiction.description}
          </p>
          <div className="p-2.5 bg-[var(--surface-1)] rounded-[4px] border border-[var(--border-default)] text-[var(--text-2)] text-xs font-serif leading-relaxed">
            <strong className="text-[var(--text-1)] font-sans">Interpretation (simulated):</strong> {selectedVessel.contradiction.implication}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[8px] text-xs flex items-center gap-2 text-[var(--text-2)] font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--text-3)]" />
          <span>
            Continuous transponder broadcast received throughout the 100-minute inferred release window.
          </span>
        </div>
      )}

      {/* AIS Continuity Gantt Timeline */}
      <Card className="bg-[var(--surface-1)] border-[var(--border-default)]">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-3">
          <div className="flex items-center gap-2 text-[var(--text-1)] font-semibold text-xs font-mono uppercase tracking-wider">
            <Radio className="w-4 h-4 text-[var(--violet-400)]" />
            <span>AIS BROADCAST CONTINUITY (15:50 - 17:30 UTC)</span>
          </div>
          <span className="font-mono text-xs text-[var(--text-3)]">
            Total Missing: {100 - selectedVessel.continuity} min
          </span>
        </div>

        {/* Visual timeline bar (100 minutes representation) */}
        <div className="space-y-1.5">
          <div className="w-full h-7 bg-[var(--surface-2)] rounded-[4px] border border-[var(--border-default)] flex overflow-hidden relative">
            {/* Release epoch vertical cursor */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--inferred)] z-10 shadow-[0_0_8px_var(--inferred)]"
              style={{ left: '50%' }}
              title="Inferred Release Epoch: 16:40 UTC"
            />

            {/* Segment blocks */}
            {selectedVessel.id === 'v2' ? (
              // MV Pacific Lantern 38m blackout from 16:25 to 17:03 (mins 35 to 73)
              <>
                <div className="h-full bg-[var(--observed)]" style={{ width: '35%' }} title="Observed AIS Broadcast Active (15:50 - 16:25 UTC)" />
                <div className="h-full bg-[var(--danger)]/30 border-y border-dashed border-[var(--danger)]" style={{ width: '38%' }} title="Derived: Interpolated AIS Gap (16:25 - 17:03 UTC)" />
                <div className="h-full bg-[var(--observed)]" style={{ width: '27%' }} title="Observed AIS Broadcast Restored (17:03 - 17:30 UTC)" />
              </>
            ) : selectedVessel.id === 'v6' ? (
              <>
                <div className="h-full bg-[var(--observed)]" style={{ width: '2% ' }} />
                <div className="h-full bg-[var(--danger)]/30 border-y border-dashed border-[var(--danger)]" style={{ width: '22%' }} title="22 min gap" />
                <div className="h-full bg-[var(--observed)]" style={{ width: '24%' }} />
                <div className="h-full bg-[var(--danger)]/30 border-y border-dashed border-[var(--danger)]" style={{ width: '20%' }} title="20 min gap" />
                <div className="h-full bg-[var(--observed)]" style={{ width: '32%' }} />
              </>
            ) : selectedVessel.id === 'v1' ? (
              <>
                <div className="h-full bg-[var(--observed)]" style={{ width: '5%' }} />
                <div className="h-full bg-[var(--danger)]/30 border-y border-dashed border-[var(--danger)]" style={{ width: '3%' }} title="3 min gap" />
                <div className="h-full bg-[var(--observed)]" style={{ width: '92%' }} />
              </>
            ) : selectedVessel.id === 'v4' ? (
              <>
                <div className="h-full bg-[var(--observed)]" style={{ width: '55%' }} />
                <div className="h-full bg-[var(--danger)]/30 border-y border-dashed border-[var(--danger)]" style={{ width: '6%' }} title="6 min gap" />
                <div className="h-full bg-[var(--observed)]" style={{ width: '39%' }} />
              </>
            ) : selectedVessel.id === 'v5' ? (
              <>
                <div className="h-full bg-[var(--observed)]" style={{ width: '20%' }} />
                <div className="h-full bg-[var(--danger)]/30 border-y border-dashed border-[var(--danger)]" style={{ width: '9%' }} title="9 min gap" />
                <div className="h-full bg-[var(--observed)]" style={{ width: '71%' }} />
              </>
            ) : (
              // Continuous track (v3: 99%)
              <div
                className="h-full bg-[var(--observed)]"
                style={{ width: `${selectedVessel.continuity}%` }}
                title="Observed continuous transponder reception"
              />
            )}
          </div>

          <div className="flex justify-between text-xs font-mono text-[var(--text-3)]">
            <span>15:50 UTC</span>
            <span className="text-[var(--inferred)] font-semibold">16:40 UTC (Inferred Release Epoch)</span>
            <span>17:30 UTC</span>
          </div>
        </div>

        {selectedVessel.gaps.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-1">
            <span className="text-xs font-mono text-[var(--text-3)] font-semibold">RECORDED RECEPTION GAPS:</span>
            {selectedVessel.gaps.map((g, idx) => (
              <div key={idx} className="text-xs font-mono text-[var(--text-2)] flex items-center justify-between">
                <span className="text-[var(--danger)]">
                  {g.start.substring(11, 16)} - {g.end.substring(11, 16)} UTC ({g.durationMinutes} min)
                </span>
                <span className="text-[var(--text-3)] font-sans">{g.reason}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Evidence Integrity Breakdown */}
      <Card className="bg-[var(--surface-1)] border-[var(--border-default)]">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-2">
          <div className="flex items-center gap-2 text-[var(--text-1)] font-semibold text-xs font-mono uppercase tracking-wider">
            <Shield className="w-4 h-4 text-[var(--observed)]" />
            <span>EVIDENCE PROVENANCE PROPORTION</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="p-2.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--observed)]/40">
            <div className="text-xs font-mono text-[var(--observed)] font-semibold uppercase">OBSERVED</div>
            <div className="text-base font-bold font-mono text-[var(--text-1)] mt-0.5">
              {selectedVessel.provenance.observed}%
            </div>
            <div className="text-xs font-sans text-[var(--text-3)]">Raw AIS broadcast & SAR</div>
          </div>
          <div className="p-2.5 rounded-[4px] bg-[var(--surface-2)] border border-dashed border-[var(--derived)]/50">
            <div className="text-xs font-mono text-[var(--derived)] font-semibold uppercase">DERIVED</div>
            <div className="text-base font-bold font-mono text-[var(--text-1)] mt-0.5">
              {selectedVessel.provenance.derived}%
            </div>
            <div className="text-xs font-sans text-[var(--text-3)]">Dead-reckoning & gaps</div>
          </div>
          <div className="p-2.5 rounded-[4px] bg-[var(--surface-2)] border border-dotted border-[var(--inferred)]/50">
            <div className="text-xs font-mono text-[var(--inferred)] font-semibold uppercase">INFERRED</div>
            <div className="text-base font-bold font-mono text-[var(--text-1)] mt-0.5">
              {isRank1 ? 'Rank 1 Lead' : `#${selectedVessel.rank} Candidate`}
            </div>
            <div className="text-xs font-sans text-[var(--text-3)]">OpenDrift & Borda model</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
