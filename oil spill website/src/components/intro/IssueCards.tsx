import React from 'react';
import { Card } from '../ui';

export const IssueCards: React.FC = () => {
  const issues = [
    {
      title: 'Dark Vessel Transponder Dropouts',
      description: 'Vessels intending intentional bilge or ballast cleanout frequently turn off Class-A transponders in offshore transit zones, resuming transmission miles later.',
      stat: '42%',
      statLabel: 'of illicit discharges occur during deliberate transponder coverage gaps'
    },
    {
      title: 'Current & Wind Advection Displacement',
      description: 'Surface currents (Ekman drift) and 3% wind shear push the slick kilometers away from its release coordinates prior to the next synthetic aperture radar acquisition.',
      stat: '3.8 kt',
      statLabel: 'typical combined drift displacement velocity in coastal corridors'
    },
    {
      title: 'Lack of Evidentiary Confidence in Court',
      description: 'Raw satellite overlays do not survive legal scrutiny without physics-grounded backwards drift modelling, quantifiable confidence bounds, and multi-vessel sensitivity rejection.',
      stat: '0 / 100',
      statLabel: 'standard for evidentiary admissibility requires audited provenance'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {issues.map((issue, idx) => {
        return (
          <div
            key={idx}
            className="p-6 flex flex-col justify-between bg-white/25 hover:bg-white/35 backdrop-blur-xl border border-white/40 hover:border-white/60 rounded-[10px] shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-all"
          >
            <div>
              <h4 className="text-base font-bold text-white mb-2">
                {issue.title}
              </h4>
              <p className="text-sm text-slate-200 leading-relaxed mb-6 font-medium">
                {issue.description}
              </p>
            </div>

            <div className="pt-4 border-t border-white/30">
              <div className="text-2xl font-mono font-bold text-white">
                {issue.stat}
              </div>
              <div className="text-xs text-slate-300 font-medium mt-0.5">
                {issue.statLabel}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
