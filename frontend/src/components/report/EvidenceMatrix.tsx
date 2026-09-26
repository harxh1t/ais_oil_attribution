import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCase } from '../../context/CaseContext';
import { Badge } from '../ui';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { CandidateVessel, computeBorda } from '../../data/malibuCase';

type SortField =
  | 'rank'
  | 'name'
  | 'dcpa'
  | 'tcpa'
  | 'frechet'
  | 'continuity'
  | 'borda'
  | 'confidence';

export const EvidenceMatrix: React.FC = () => {
  const { caseData, selectedVesselId, setSelectedVesselId } = useCase();
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [expandedVesselId, setExpandedVesselId] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Compute points arithmetic for all vessels
  const bordaBreakdowns = useMemo(() => {
    const list = computeBorda(caseData.vessels);
    const map: Record<string, { total: number; breakdown: Record<string, number> }> = {};
    list.forEach((item) => {
      map[item.id] = { total: item.borda, breakdown: item.breakdown };
    });
    return map;
  }, [caseData.vessels]);

  // Compute min/max for violet heat ramp
  const stats = useMemo(() => {
    const v = caseData.vessels;
    return {
      dcpa: { min: Math.min(...v.map((s) => s.dcpa)), max: Math.max(...v.map((s) => s.dcpa)) },
      tcpa: { min: Math.min(...v.map((s) => s.tcpa)), max: Math.max(...v.map((s) => s.tcpa)) },
      frechet: { min: Math.min(...v.map((s) => s.frechet)), max: Math.max(...v.map((s) => s.frechet)) },
      continuity: { min: Math.min(...v.map((s) => s.continuity)), max: Math.max(...v.map((s) => s.continuity)) },
      borda: { min: Math.min(...v.map((s) => s.borda)), max: Math.max(...v.map((s) => s.borda)) },
      confidence: { min: Math.min(...v.map((s) => s.confidence)), max: Math.max(...v.map((s) => s.confidence)) },
    };
  }, [caseData.vessels]);

  // Violet heat ramp background style (alpha 0.0 to 0.25)
  const getVioletTint = (value: number, min: number, max: number, invert = false) => {
    if (max === min) return undefined;
    const ratio = invert
      ? (value - min) / (max - min) // higher is better (continuity, borda, confidence)
      : (max - value) / (max - min); // lower is better (dcpa, tcpa, frechet)
    const clamped = Math.max(0, Math.min(1, ratio));
    const alpha = (clamped * 0.25).toFixed(3);
    return `rgba(142, 123, 255, ${alpha})`;
  };

  // Sorting
  const sortedVessels = useMemo(() => {
    return [...caseData.vessels].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'dcpa':
          comparison = a.dcpa - b.dcpa;
          break;
        case 'tcpa':
          comparison = a.tcpa - b.tcpa;
          break;
        case 'frechet':
          comparison = a.frechet - b.frechet;
          break;
        case 'continuity':
          comparison = a.continuity - b.continuity;
          break;
        case 'borda':
          comparison = a.borda - b.borda;
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [caseData.vessels, sortField, sortAsc]);

  const handleHeaderClick = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' || field === 'rank' || field === 'dcpa' || field === 'tcpa' || field === 'frechet');
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = sortedVessels.findIndex((v) => v.id === selectedVesselId);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(sortedVessels.length - 1, currentIndex + 1);
      setSelectedVesselId(sortedVessels[nextIndex].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(0, currentIndex - 1);
      setSelectedVesselId(sortedVessels[prevIndex].id);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (selectedVesselId) {
        setExpandedVesselId((cur) => (cur === selectedVesselId ? null : selectedVesselId));
      }
    }
  };

  return (
    <div
      className="w-full bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] overflow-hidden shadow-2xl focus:outline-none focus:ring-1 focus:ring-[var(--violet-400)]"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      ref={tableRef}
    >
      {/* Header bar */}
      <div className="p-4 bg-[var(--surface-2)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-base text-[var(--text-1)] uppercase tracking-wider">
              CANDIDATE ATTRIBUTION MATRIX
            </h3>
            <Badge variant="inferred" size="sm">
              Borda Consensus
            </Badge>
            <span className="font-mono text-xs text-[var(--text-3)]">
              (Use ↑/↓ keys to navigate, Enter to inspect points)
            </span>
          </div>
          <p className="text-xs font-sans text-[var(--text-3)] mt-1">
            Standardised multi-criteria evaluation of candidates transiting Santa Monica Bay during the 100-minute window.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-3)]">
          <div className="flex items-center gap-1.5 bg-[var(--surface-1)] px-2.5 py-1 rounded-[4px] border border-[var(--border-default)]">
            <span className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(142, 123, 255, 0.25)' }} />
            <span className="text-[var(--text-2)]">Violet Tint = Optimal Metric Value</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-3)] font-mono select-none">
              {/* Rank */}
              <th
                onClick={() => handleHeaderClick('rank')}
                className="py-3 px-3 font-semibold cursor-pointer hover:text-[var(--text-1)] transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>RANK</span>
                  {sortField === 'rank' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--violet-400)]" /> : <ArrowDown className="w-3 h-3 text-[var(--violet-400)]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>

              {/* Vessel */}
              <th
                onClick={() => handleHeaderClick('name')}
                className="py-3 px-3 font-semibold cursor-pointer hover:text-[var(--text-1)] transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>CANDIDATE VESSEL</span>
                  {sortField === 'name' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--violet-400)]" /> : <ArrowDown className="w-3 h-3 text-[var(--violet-400)]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>

              {/* Type / Flag */}
              <th className="py-3 px-3 font-semibold whitespace-nowrap">TYPE / FLAG</th>

              {/* DCPA */}
              <th
                onClick={() => handleHeaderClick('dcpa')}
                className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-[var(--text-1)] transition-colors whitespace-nowrap"
                title="Derived: Distance at Closest Point of Approach (lower is closer)"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>DCPA (DERIVED)</span>
                  {sortField === 'dcpa' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--violet-400)]" /> : <ArrowDown className="w-3 h-3 text-[var(--violet-400)]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>

              {/* |TCPA| */}
              <th
                onClick={() => handleHeaderClick('tcpa')}
                className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-[var(--text-1)] transition-colors whitespace-nowrap"
                title="Derived: Time to Closest Point of Approach in minutes (lower is tighter)"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>|TCPA| (DERIVED)</span>
                  {sortField === 'tcpa' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--violet-400)]" /> : <ArrowDown className="w-3 h-3 text-[var(--violet-400)]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>

              {/* Fréchet */}
              <th
                onClick={() => handleHeaderClick('frechet')}
                className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-[var(--text-1)] transition-colors whitespace-nowrap"
                title="Derived: Discrete Fréchet curve distance to drift path (lower is better fit)"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>FRÉCHET (DERIVED)</span>
                  {sortField === 'frechet' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--violet-400)]" /> : <ArrowDown className="w-3 h-3 text-[var(--violet-400)]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>

              {/* AIS Continuity */}
              <th
                onClick={() => handleHeaderClick('continuity')}
                className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-[var(--text-1)] transition-colors whitespace-nowrap"
                title="Derived: AIS broadcast coverage in 100-minute critical window (higher is better)"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>AIS CONT. (DERIVED)</span>
                  {sortField === 'continuity' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--violet-400)]" /> : <ArrowDown className="w-3 h-3 text-[var(--violet-400)]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>

              {/* Borda Score */}
              <th
                onClick={() => handleHeaderClick('borda')}
                className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-[var(--text-1)] transition-colors whitespace-nowrap"
                title="Inferred: Aggregated consensus points out of 20 (higher is better)"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>BORDA (INFERRED)</span>
                  {sortField === 'borda' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--violet-400)]" /> : <ArrowDown className="w-3 h-3 text-[var(--violet-400)]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>

              {/* Confidence */}
              <th
                onClick={() => handleHeaderClick('confidence')}
                className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-[var(--text-1)] transition-colors whitespace-nowrap"
                title="Inferred: Normalized forensic attribution confidence"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>CONFIDENCE</span>
                  {sortField === 'confidence' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--violet-400)]" /> : <ArrowDown className="w-3 h-3 text-[var(--violet-400)]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>

              <th className="py-3 px-3 text-center whitespace-nowrap">ARITHMETIC</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
            {sortedVessels.map((v) => {
              const isSelected = v.id === selectedVesselId;
              const isExpanded = expandedVesselId === v.id;
              const arithmetic = bordaBreakdowns[v.id];

              // Medal rendering for ranks 1-3
              const medalIcon =
                v.rank === 1 ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/50 text-xs" title="Rank 1 Gold">
                    1
                  </span>
                ) : v.rank === 2 ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-400/20 text-slate-300 font-bold border border-slate-400/50 text-xs" title="Rank 2 Silver">
                    2
                  </span>
                ) : v.rank === 3 ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700/20 text-amber-500 font-bold border border-amber-700/50 text-xs" title="Rank 3 Bronze">
                    3
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--surface-2)] text-[var(--text-3)] text-xs border border-[var(--border-default)]">
                    {v.rank}
                  </span>
                );

              return (
                <React.Fragment key={v.id}>
                  <tr
                    onClick={() => {
                      setSelectedVesselId(v.id);
                      setExpandedVesselId((cur) => (cur === v.id ? null : v.id));
                    }}
                    className={cn(
                      'cursor-pointer transition-colors group',
                      isSelected
                        ? 'bg-[var(--surface-3)] text-[var(--text-1)]'
                        : 'hover:bg-[var(--surface-2)] text-[var(--text-2)]',
                      v.rank === 1 && !isSelected && 'bg-[var(--surface-2)]/30'
                    )}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">{medalIcon}</div>
                    </td>

                    {/* Candidate Vessel */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'font-sans font-semibold text-xs transition-colors',
                              isSelected ? 'text-white' : 'text-[var(--text-1)] group-hover:text-[var(--violet-300)]'
                            )}
                          >
                            {v.name}
                          </span>
                          {v.contradiction && (
                            <span
                              title="Contradiction: 38-minute AIS silence during inferred release window"
                              className="text-[var(--danger)]"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 inline" />
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-xs text-[var(--text-3)]">MMSI: {v.mmsi}</span>
                      </div>
                    </td>

                    {/* Type / Flag */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex flex-col text-xs font-sans">
                        <span className="text-[var(--text-1)] font-medium">{v.type}</span>
                        <span className="text-[var(--text-3)]">{v.flag}</span>
                      </div>
                    </td>

                    {/* DCPA (Violet tint) */}
                    <td
                      className="py-3 px-3 text-right font-mono text-[var(--text-1)] tabular-nums whitespace-nowrap"
                      style={{ backgroundColor: getVioletTint(v.dcpa, stats.dcpa.min, stats.dcpa.max, false) }}
                    >
                      {v.dcpa.toFixed(1)} km
                    </td>

                    {/* |TCPA| (Violet tint) */}
                    <td
                      className="py-3 px-3 text-right font-mono text-[var(--text-1)] tabular-nums whitespace-nowrap"
                      style={{ backgroundColor: getVioletTint(v.tcpa, stats.tcpa.min, stats.tcpa.max, false) }}
                    >
                      {v.tcpa} min
                    </td>

                    {/* Fréchet (Violet tint) */}
                    <td
                      className="py-3 px-3 text-right font-mono text-[var(--text-1)] tabular-nums whitespace-nowrap"
                      style={{ backgroundColor: getVioletTint(v.frechet, stats.frechet.min, stats.frechet.max, false) }}
                    >
                      {v.frechet.toFixed(1)} km
                    </td>

                    {/* AIS Continuity (Violet tint) */}
                    <td
                      className="py-3 px-3 text-right font-mono text-[var(--text-1)] tabular-nums whitespace-nowrap"
                      style={{ backgroundColor: getVioletTint(v.continuity, stats.continuity.min, stats.continuity.max, true) }}
                    >
                      {v.continuity}%
                    </td>

                    {/* Borda Score (Violet tint) */}
                    <td
                      className="py-3 px-3 text-right font-mono whitespace-nowrap"
                      style={{ backgroundColor: getVioletTint(v.borda, stats.borda.min, stats.borda.max, true) }}
                    >
                      <span className="font-bold text-[var(--text-1)] text-xs tabular-nums">{v.borda}</span>
                      <span className="text-[var(--text-3)] text-xs">/20</span>
                    </td>

                    {/* Confidence (Violet tint) */}
                    <td
                      className="py-3 px-3 text-right font-mono text-[var(--text-1)] font-semibold tabular-nums whitespace-nowrap"
                      style={{ backgroundColor: getVioletTint(v.confidence, stats.confidence.min, stats.confidence.max, true) }}
                    >
                      {(v.confidence * 100).toFixed(0)}%
                    </td>

                    {/* Expand/Collapse Toggle */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVesselId(v.id);
                          setExpandedVesselId((cur) => (cur === v.id ? null : v.id));
                        }}
                        className="p-1 rounded-[4px] hover:bg-[var(--surface-3)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
                        title="View Borda points arithmetic breakdown"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[var(--violet-400)]" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expandable Points Arithmetic Row */}
                  {isExpanded && arithmetic && (
                    <tr className="bg-[var(--surface-2)]/90 border-b border-[var(--border-subtle)] text-xs font-mono">
                      <td colSpan={10} className="py-3 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-1)] p-3 rounded-[6px] border border-[var(--border-default)]">
                          <div className="flex items-center gap-2 text-[var(--text-2)]">
                            <Info className="w-4 h-4 text-[var(--violet-400)] shrink-0" />
                            <span className="font-semibold uppercase tracking-wider text-[var(--text-1)]">
                              BORDA ARITHMETIC:
                            </span>
                            <span className="text-[var(--text-2)]">
                              DCPA rank → <strong className="text-[var(--violet-300)]">{arithmetic.breakdown.dcpa} pts</strong> ·
                              TCPA rank → <strong className="text-[var(--violet-300)]">{arithmetic.breakdown.tcpa} pts</strong> ·
                              Fréchet rank → <strong className="text-[var(--violet-300)]">{arithmetic.breakdown.frechet} pts</strong> ·
                              Continuity rank → <strong className="text-[var(--violet-300)]">{arithmetic.breakdown.continuity} pts</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[var(--text-3)]">Consensus Sum:</span>
                            <span className="px-2 py-0.5 rounded-[4px] bg-[var(--violet-950)]/40 border border-[var(--violet-400)]/40 font-bold text-[var(--violet-300)]">
                              {arithmetic.total} / 20 pts
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
