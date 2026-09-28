import React from 'react';
import { Card, Table, Thead, Tbody, Tr, Th, Td, Badge } from '../ui';

export const SensitivityTable: React.FC = () => {
  const tests = [
    {
      parameter: 'Current Field Perturbation',
      variation: 'ROMS velocity ±20%',
      displacement: '± 0.85 km',
      candidate1Attribution: '85% – 91%',
      outcome: 'Robust'
    },
    {
      parameter: 'Wind Shear Uncertainty',
      variation: 'ERA5 wind direction ±15°',
      displacement: '± 1.20 km',
      candidate1Attribution: '82% – 90%',
      outcome: 'Robust'
    },
    {
      parameter: 'Discharge Depth & Windage',
      variation: 'Windage factor 2.5% to 3.8%',
      displacement: '± 0.64 km',
      candidate1Attribution: '86% – 89%',
      outcome: 'Robust'
    },
    {
      parameter: 'Kinematic Maneuver Limit',
      variation: 'Turn rate limit 1.5°/s vs 3.0°/s',
      displacement: '± 0.31 km',
      candidate1Attribution: '87% – 88%',
      outcome: 'Insensitive'
    }
  ];

  return (
    <Card className="p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase font-mono">
              Hydrodynamic Sensitivity Stress-Testing
            </h3>
          </div>
          <Badge variant="neutral">Monte Carlo</Badge>
        </div>

        <div className="mt-4 overflow-hidden rounded-[6px] border border-[var(--border-subtle)]">
          <Table>
            <Thead>
              <Tr>
                <Th>Parameter Stress</Th>
                <Th>Centroid Shift</Th>
                <Th>Target Score Range</Th>
                <Th>Result</Th>
              </Tr>
            </Thead>
            <Tbody>
              {tests.map((test, idx) => (
                <Tr key={idx}>
                  <Td className="text-xs">
                    <div className="font-semibold text-[var(--text-1)]">{test.parameter}</div>
                    <div className="text-[11px] text-[var(--text-3)] font-mono">{test.variation}</div>
                  </Td>
                  <Td className="font-mono text-xs text-[var(--text-2)]">{test.displacement}</Td>
                  <Td className="font-mono text-xs font-semibold text-[var(--primary-600)]">
                    {test.candidate1Attribution}
                  </Td>
                  <Td>
                    <Badge variant="neutral">{test.outcome}</Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>
    </Card>
  );
};
