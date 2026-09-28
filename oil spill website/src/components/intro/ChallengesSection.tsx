import React from 'react';
import { ChapterHeader, Card } from '../ui';
import { IssueCards } from './IssueCards';
import { GapFigure } from './GapFigure';

export const ChallengesSection: React.FC = () => {
  return (
    <section id="challenges" className="py-20 bg-transparent border-t border-[var(--border-subtle)] scroll-mt-16">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <ChapterHeader
          stepNumber="02"
          eyebrow="The Forensic Problem"
          title="Why offshore attribution fails today"
          description="Traditional SAR detection finds the spill when the satellite passes overhead. By then, currents and wind have moved the slick miles from the discharge point, and AIS tracking data has gaps, intentional transponder dropouts, or spoofed identifiers."
          titleClassName="text-white"
          descriptionClassName="text-slate-200"
        />

        <div className="mt-12 space-y-12">
          {/* 3 Core Challenges Cards */}
          <IssueCards />

          {/* Interactive AIS Gap Visualization Figure */}
          <div className="p-6 md:p-8 bg-white/25 backdrop-blur-xl border border-white/40 rounded-[10px] shadow-[0_12px_36px_rgba(0,0,0,0.22)]">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">
                Visualisation of the Ship Passing Through the Spillage Area
              </h3>
              <p className="text-sm text-slate-200 mt-1">
                An interactive visualisation is available demonstrating the ship passing directly through the spillage area, illustrating the vessel's trajectory intersecting the discharge zone before hydrodynamic currents displaced the slick.
              </p>
            </div>
            <GapFigure />
          </div>
        </div>
      </div>
    </section>
  );
};
