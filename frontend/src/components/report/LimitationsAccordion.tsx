import React, { useState } from 'react';
import { Card } from '../ui';
import { AlertCircle, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface NoteItem {
  id: string;
  title: string;
  summary: string;
  body: string;
}

const METHOD_NOTES: NoteItem[] = [
  {
    id: 'decision-support',
    title: 'Investigative decision support only, not legal findings',
    summary: 'WAKE outputs are mathematical hypotheses intended to triage maritime surveillance leads.',
    body: 'Automated reverse hindcasting and Borda ranking establish physical consistency between candidate trajectories and detected marine slicks. They do not constitute judicial or administrative evidence of illegal discharge, liability, or intentional discharge without physical sampling, logbook inspection, and formal port state investigation.',
  },
  {
    id: 'simulated-data',
    title: 'All case data and candidate vessels are simulated',
    summary: 'Demonstration environment utilizing synthetic observations and fictional vessels.',
    body: 'All geospatial data, satellite imagery contours, transponder IDs (MMSI), vessel names, and environmental forcing values depicted in this dossier are simulated demonstration data designed to showcase pipeline capabilities. Any resemblance to real vessels, active commercial voyages, or actual spill events is entirely coincidental.',
  },
  {
    id: 'epoch-sensitivity',
    title: 'Candidate ranking depends on the release-epoch estimate',
    summary: 'Advection trajectories diverge rapidly with temporal shifts in estimated release epoch.',
    body: 'Lagrangian drift backtracking is highly dependent upon the estimated release time. Sensitivity testing demonstrates that advancing the assumed discharge epoch by +25 minutes shifts the lead candidate from MV Meridian Crest to MV Pacific Lantern. Accurate slicks-aging estimation (e.g. from optical/SAR thickness grading or oil weathering models) is paramount.',
  },
  {
    id: 'ais-gaps',
    title: 'AIS gaps may reflect terrestrial coverage limits, not intent',
    summary: 'Transponder dropouts can be caused by physical propagation effects or coastal terrain shadow.',
    body: 'Terrestrial and satellite Automatic Identification System (AIS) reception in coastal embayments is prone to VHF multi-path fading, signal collision in high-density corridors, and receiver antenna occlusion by coastal topography (such as the Santa Monica Mountains). A signal gap must not be assumed to indicate deliberate transponder deactivation without corroborating technical forensics.',
  },
  {
    id: 'forcing-uncertainty',
    title: 'External hydrodynamic forcing fields carry intrinsic uncertainty',
    summary: 'Global atmospheric and ocean models possess finite spatial and temporal resolution.',
    body: 'Numerical hindcasts rely on GFS atmospheric models (0.25° resolution) and HYCOM/CMEMS coastal ocean circulation models (1/12° resolution). Sub-mesoscale coastal eddies, internal waves, rip currents, and localized wind gusts within 15 km of shore are not fully resolved and introduce drift path dispersion.',
  },
];

export const LimitationsAccordion: React.FC = () => {
  const [openIds, setOpenIds] = useState<string[]>(['decision-support']);

  const toggle = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[var(--violet-400)]" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-[var(--text-1)]">
            LIMITATIONS & METHODOLOGICAL NOTES
          </h3>
        </div>
        <span className="font-mono text-xs text-[var(--text-3)]">
          Forensic Transparency Standards
        </span>
      </div>

      {/* Accordion Items */}
      <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-[6px] overflow-hidden">
        {METHOD_NOTES.map((note) => {
          const isOpen = openIds.includes(note.id);
          return (
            <div key={note.id} className="bg-[var(--surface-1)] transition-colors">
              <button
                type="button"
                onClick={() => toggle(note.id)}
                className="w-full py-3 px-4 flex items-center justify-between text-left hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="text-[var(--violet-400)]">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-sans font-semibold text-xs text-[var(--text-1)] block">
                      {note.title}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-3)] block mt-0.5">
                      {note.summary}
                    </span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 font-serif text-[14px] text-[var(--text-2)] leading-relaxed bg-[var(--surface-2)]/60 border-t border-[var(--border-subtle)]">
                  {note.body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
