import React from 'react';
import { useCase } from '../../context/CaseContext';
import { Card, Table, Thead, Tbody, Tr, Th, Td, Badge } from '../ui';
import { CandidateVessel } from '../../data/malibuCase';

export const EvidenceMatrix: React.FC = () => {
  const { caseData } = useCase();

  return (
    <Card className="overflow-hidden border border-[var(--border-default)]">
      <Table>
        <Thead>
          <Tr>
            <Th>Candidate Vessel</Th>
            <Th>MMSI / Type</Th>
            <Th>DCPA (km)</Th>
            <Th>|TCPA| (min)</Th>
            <Th>Fréchet (km)</Th>
            <Th>AIS Continuity</Th>
            <Th>Borda Pts</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {caseData.vessels.map((vessel: CandidateVessel, idx: number) => (
            <Tr
              key={vessel.id}
              className={idx === 0 ? 'bg-[var(--primary-50)]/40' : ''}
            >
              <Td className="font-bold text-[var(--text-1)]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--text-3)]">#{vessel.rank}</span>
                  <span>{vessel.name}</span>
                </div>
              </Td>
              <Td className="font-mono text-xs text-[var(--text-2)]">
                {vessel.mmsi} / {vessel.type}
              </Td>
              <Td className="font-mono text-xs text-[var(--text-1)]">
                {vessel.dcpa} km
              </Td>
              <Td className="font-mono text-xs text-[var(--text-1)]">
                {vessel.tcpa} min
              </Td>
              <Td className="font-mono text-xs text-[var(--text-2)]">
                {vessel.frechet} km
              </Td>
              <Td className="font-mono text-xs text-[var(--text-2)]">
                {vessel.continuity}%
              </Td>
              <Td className="font-mono font-bold text-xs">
                <span
                  className={
                    idx === 0
                      ? 'text-[var(--primary-600)]'
                      : 'text-[var(--text-3)]'
                  }
                >
                  {vessel.borda} pts
                </span>
              </Td>
              <Td>
                {idx === 0 ? (
                  <Badge variant="inferred">Candidate #1</Badge>
                ) : (
                  <Badge variant="neutral">Rank #{vessel.rank}</Badge>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Card>
  );
};
