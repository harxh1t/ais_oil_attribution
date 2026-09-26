import React from 'react';
import { Check, Minus } from 'lucide-react';

const COMPARISONS = [
  {
    criterion: 'Reference Point',
    naive: 'Slick centroid at satellite image acquisition time',
    wake: 'Hindcast source location at inferred discharge release epoch',
  },
  {
    criterion: 'Attribution Ranking',
    naive: 'Nearest Euclidean distance at image time',
    wake: 'Four kinematic criteria (DCPA, TCPA, Fréchet, Continuity) + Borda consensus',
  },
  {
    criterion: 'AIS Broadcast Gaps',
    naive: 'Silently bridged with linear assumption, hiding dropouts',
    wake: 'Scored via Continuity Index, drawn dashed (Derived), and flagged',
  },
  {
    criterion: 'Hydrodynamic Uncertainty',
    naive: 'Single deterministic back-trajectory line',
    wake: 'Lagrangian particle cloud ensemble + 95% confidence error ellipse',
  },
  {
    criterion: 'Evidence Provenance',
    naive: 'Blended black-box index without auditable trail',
    wake: 'Strictly separated into Observed, Derived, and Inferred tiers',
  },
  {
    criterion: 'Investigation Output',
    naive: 'Single isolated vessel name',
    wake: 'Auditable ranked shortlist, interactive 3D studio, and structured dossier',
  },
];

export const ComparisonTable: React.FC = () => {
  return (
    <div className="w-full bg-[#0E0B1F] border border-[rgba(167,139,250,0.2)] rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-[rgba(167,139,250,0.15)]">
        <h4 className="font-display font-bold text-lg text-[#F4F2FF]">
          Naive Spatial Matching vs WAKE Forensic Attribution
        </h4>
        <p className="font-sans text-xs text-[#C0BCDB] mt-1">
          Comparison of conventional ad-hoc geospatial proximity queries versus WAKE&apos;s hydrodynamic kinematics pipeline.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[620px]">
          <thead>
            <tr className="border-b border-[rgba(167,139,250,0.15)] bg-[#070512] font-mono text-xs text-[#9691B3]">
              <th className="py-3 px-4 font-semibold w-1/4">DIMENSION</th>
              <th className="py-3 px-4 font-semibold w-3/8 text-[#FB7185]">CONVENTIONAL NAIVE MATCHING</th>
              <th className="py-3 px-4 font-semibold w-3/8 text-[#A78BFA] border-l-2 border-[#7C3AED] bg-[#7C3AED]/5">
                WAKE SYSTEM
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(167,139,250,0.1)] text-xs font-sans">
            {COMPARISONS.map((row, idx) => (
              <tr key={idx} className="hover:bg-[#151230]/50 transition-colors">
                <td className="py-3.5 px-4 font-mono font-medium text-[#F4F2FF]">
                  {row.criterion}
                </td>
                <td className="py-3.5 px-4 text-[#C0BCDB]">
                  <div className="flex items-start gap-2">
                    <Minus className="w-4 h-4 text-[#FB7185] shrink-0 mt-0.5" />
                    <span>{row.naive}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-[#F4F2FF] border-l-2 border-[#7C3AED] bg-[#7C3AED]/5">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                    <span>{row.wake}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
