import React from 'react';
import { Card, Table, Thead, Tbody, Tr, Th, Td, Badge } from '../ui';
import { Check, X } from 'lucide-react';

export const ComparisonTable: React.FC = () => {
  const rows = [
    {
      capability: 'Discharge Point Back-Projection',
      conventional: 'Static distance to satellite detection footprint',
      wake: 'Lagrangian backwards drift modelling (ROMS currents + wind shear)',
      wakeAdvantage: true
    },
    {
      capability: 'AIS Dark Vessel Gap Handling',
      conventional: 'Dropped or assumed non-existent during transponder gap',
      wake: 'Kinematic kalman trajectory interpolation with maneuver limits',
      wakeAdvantage: true
    },
    {
      capability: 'Evidentiary Provenance Tracking',
      conventional: 'Manual GIS screenshot collation',
      wake: 'Formal 3-tier classification (Observed, Derived, Inferred)',
      wakeAdvantage: true
    },
    {
      capability: 'Uncertainty & Sensitivity Auditing',
      conventional: 'Unquantified subjective analyst judgment',
      wake: 'Monte Carlo ensemble perturbations (current ±20%, wind ±15°)',
      wakeAdvantage: true
    },
    {
      capability: 'Shortlist Multi-Hypothesis Scoring',
      conventional: 'Single suspect selection without counter-factual test',
      wake: 'Shortlist ranking with forward-fit validation & exclusion logs',
      wakeAdvantage: true
    }
  ];

  return (
    <Card className="overflow-hidden shadow-[0_18px_40px_-4px_rgba(15,23,42,0.22),0_8px_18px_-2px_rgba(15,23,42,0.12)]">
      <Table>
        <Thead>
          <Tr>
            <Th className="w-1/3">Capability / Criteria</Th>
            <Th className="w-1/3">Conventional GIS Overlay</Th>
            <Th className="w-1/3 text-white font-bold">WAKE Attribution System</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, idx) => (
            <Tr key={idx}>
              <Td className="font-medium text-[var(--text-1)]">
                {row.capability}
              </Td>
              <Td className="text-[var(--text-2)] text-xs leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-[var(--text-3)] mt-0.5">•</span>
                  <span>{row.conventional}</span>
                </div>
              </Td>
              <Td className="text-[var(--text-1)] text-xs leading-relaxed bg-[var(--primary-50)]/30 font-medium">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--observed)] shrink-0 mt-0.5" />
                  <span>{row.wake}</span>
                </div>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Card>
  );
};
