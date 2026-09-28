import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Card } from '../ui';
import sarImage from '../../assets/images/sar_satalite_retrieved.jpeg';
import { AttributionImage } from '../../data/attributionImages';

interface InvestigationSetupProps {
  selectedImage?: AttributionImage;
}

export const InvestigationSetup: React.FC<InvestigationSetupProps> = ({ selectedImage }) => {
  const { parameters } = useCase();

  return (
    <Card className="p-5 sm:p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--text-1)]">Run Parameters</h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-3)]">OpenDrift v1.11</span>
        </div>

        <div className="mt-4 space-y-4">
          {/* Incident Target Data */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] font-mono block">
              Incident Coordinates (WGS84)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-[var(--text-2)] mb-1 block">Latitude</span>
                <div className="p-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-mono text-[var(--text-1)]">
                  {parameters.lat.toFixed(4)}° N
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--text-2)] mb-1 block">Longitude</span>
                <div className="p-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-mono text-[var(--text-1)]">
                  {Math.abs(parameters.lon).toFixed(4)}° W
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] font-mono block">
              Temporal Hindcast Window
            </label>
            <div>
              <span className="text-xs text-[var(--text-2)] mb-1 block">Satellite Acquisition Time</span>
              <div className="p-2.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[6px] text-xs font-mono text-[var(--text-1)] flex items-center justify-between">
                <span>{selectedImage?.timestamp.split(' ')[1] || '01:50:00Z'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extended section matching the height of the forensic map beside it with sar_satalite_retrieved image */}
      <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex-1 flex flex-col justify-end min-h-[220px]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] font-mono block truncate pr-2">
            {selectedImage ? selectedImage.name : 'SAR Satellite Retrieved Image'}
          </label>
          <span className="text-[10px] font-mono text-[var(--text-3)] shrink-0">
            {selectedImage ? selectedImage.sensor : 'C-Band Sentinel-1'}
          </span>
        </div>
        <div className="w-full flex-1 rounded-[8px] overflow-hidden border border-[var(--border-subtle)] bg-slate-900/5 shadow-inner relative flex items-center justify-center min-h-[190px]">
          <img
            src={selectedImage?.url || sarImage}
            alt={selectedImage?.name || 'SAR Satellite Retrieved Image'}
            className="w-full h-full object-cover rounded-[7px] block"
          />
        </div>
      </div>
    </Card>
  );
};
