import React from 'react';
import { Card, Table, Thead, Tbody, Tr, Th, Td } from '../ui';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export const AuditTrailTable: React.FC = () => {
  const steps = [
    {
      time: '16:40:00Z',
      action: 'Sentinel-1 SAR C-Band Acquisition',
      hash: 'sha256:4a8b...1f09',
      operator: 'Copernicus Hub Automated Ingest',
      verified: true
    },
    {
      time: '16:58:12Z',
      action: 'Lee-Sigma Speckle Filtering & Threshold Masking',
      hash: 'sha256:7c2e...99a1',
      operator: 'WAKE Preprocessor v2.4',
      verified: true
    },
    {
      time: '17:02:45Z',
      action: 'NOAA ROMS + ERA5 Lagrangian Back-Projection (14.8h)',
      hash: 'sha256:11d3...884e',
      operator: 'Lagrangian Engine N=250',
      verified: true
    },
    {
      time: '17:05:20Z',
      action: 'AIS Spatiotemporal Coincidence & Kalman Interp',
      hash: 'sha256:9f40...33bd',
      operator: 'Spatiotemporal Correlator',
      verified: true
    },
    {
      time: '17:08:15Z',
      action: 'Shortlist Generation & Sensitivity Verification',
      hash: 'sha256:3e7b...b204',
      operator: 'Lead Forensic Officer / Automated Cert',
      verified: true
    }
  ];

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase font-mono">
              Cryptographic Audit Log &amp; Chain of Custody
            </h3>
          </div>
          <span className="text-xs text-[var(--text-3)] mt-0.5 block">
            Immutable SHA-256 pipeline execution signatures for legal admissibility
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[6px] border border-[var(--border-subtle)]">
        <Table>
          <Thead>
            <Tr>
              <Th>Timestamp (UTC)</Th>
              <Th>Forensic Action</Th>
              <Th>SHA-256 Verification Hash</Th>
              <Th>Agent / Algorithm</Th>
              <Th>Integrity</Th>
            </Tr>
          </Thead>
          <Tbody>
            {steps.map((step, idx) => (
              <Tr key={idx}>
                <Td className="font-mono text-xs text-[var(--text-1)] font-semibold">
                  {step.time}
                </Td>
                <Td className="text-xs text-[var(--text-1)]">{step.action}</Td>
                <Td className="font-mono text-[11px] text-[var(--text-3)]">{step.hash}</Td>
                <Td className="text-xs text-[var(--text-2)]">{step.operator}</Td>
                <Td>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--observed)] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-[var(--text-3)] font-mono pt-3 border-t border-[var(--border-subtle)]">
        <span>Attribution Report Sign-off ID: SIG-2026-CA-MALIBU-001</span>
        <span>Certificate status: VALID (ISO/IEC 27037 compliant)</span>
      </div>
    </Card>
  );
};
