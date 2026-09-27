import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { VerdictCard } from '../components/report/VerdictCard';
import { EvidenceMatrix } from '../components/report/EvidenceMatrix';
import { AisContinuityGantt } from '../components/report/AisContinuityGantt';
import { EvidenceProvenanceBars } from '../components/report/EvidenceProvenanceBars';
import { SensitivityTable } from '../components/report/SensitivityTable';
import { ContradictionCard } from '../components/report/ContradictionCard';
import { ForwardFitValidation } from '../components/report/ForwardFitValidation';
import { LimitationsAccordion } from '../components/report/LimitationsAccordion';
import { AuditTrailTable } from '../components/report/AuditTrailTable';
import { JourneyFooter } from '../components/shared/JourneyFooter';
import { Footer } from '../components/shared/Footer';
import { Button, Card } from '../components/ui';
import { FileDown, Printer, Check, CheckCircle2 } from 'lucide-react';
import backwardSimulationImg from '../assets/images/backward_simulation_spread.svg';
import forwardSimulationImg from '../assets/images/forward_simulation_spread.svg';

function generatePrintableHtml(cData: any): string {
  const topCandidate = cData.vessels?.[0];
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>WAKE Case Attribution Report — ${cData.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #00435C; padding: 32px; max-width: 900px; margin: 0 auto; line-height: 1.5; }
    h1 { font-size: 24px; color: #00435C; border-bottom: 2px solid #00526E; padding-bottom: 8px; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #005B7D; margin-bottom: 24px; }
    .verdict-box { border: 2px solid #026651; background: #E6FAFC; padding: 16px; border-radius: 6px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: bold; background: #00526E; color: #fff; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: #007D9F; color: #fff; text-align: left; padding: 8px 12px; }
    td { border-bottom: 1px solid #d1d5db; padding: 8px 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="badge">WAKE FORENSIC ATTRIBUTION REPORT</div>
  <h1>Case Dossier: ${cData.id}</h1>
  <div class="meta">${cData.name || cData.seaArea} · Acquisition: ${cData.sarPassTime}</div>
  <div class="verdict-box">
    <strong>Primary Attributed Vessel:</strong> ${topCandidate ? topCandidate.name : 'Unknown'}<br>
    <strong>Confidence Score:</strong> ${topCandidate ? Math.round(topCandidate.confidence * 100) : 0}% · 
    <strong>DCPA:</strong> ${topCandidate ? topCandidate.dcpa : 0} km · 
    <strong>TCPA:</strong> ${topCandidate ? topCandidate.tcpaSigned : 0} min
  </div>
  <h2>Candidate Vessel Shortlist</h2>
  <table>
    <thead>
      <tr><th>Rank</th><th>Vessel Name</th><th>Flag</th><th>Type</th><th>DCPA (km)</th><th>Confidence</th></tr>
    </thead>
    <tbody>
      ${(cData.vessels || []).map((c: any) => `<tr><td>#${c.rank}</td><td><strong>${c.name}</strong></td><td>${c.flag}</td><td>${c.type}</td><td>${c.dcpa}</td><td>${Math.round(c.confidence * 100)}%</td></tr>`).join('')}
    </tbody>
  </table>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}

export const Report: React.FC = () => {
  const navigate = useNavigate();
  const { caseData } = useCase();
  const [printStatus, setPrintStatus] = useState<'idle' | 'active'>('idle');
  const [exportStatus, setExportStatus] = useState<'idle' | 'active'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handlePrint = () => {
    setPrintStatus('active');
    showToast('Opening system print dialog / PDF export...');
    try {
      window.print();
      setTimeout(() => setPrintStatus('idle'), 2500);
    } catch (err) {
      console.warn('window.print() not permitted in iframe sandbox, downloading printable HTML dossier:', err);
      const htmlContent = generatePrintableHtml(caseData);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WAKE_Printable_Report_${caseData.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast('Printable report document downloaded successfully.');
      setTimeout(() => setPrintStatus('idle'), 2500);
    }
  };

  const handleExportJson = () => {
    try {
      setExportStatus('active');
      const exportPayload = {
        title: "WAKE Forensic Case Attribution Dossier",
        exportTimestamp: new Date().toISOString(),
        caseId: caseData.id,
        classification: "SIMULATED INVESTIGATIVE RECORD",
        caseSummary: {
          location: caseData.name,
          seaArea: caseData.seaArea,
          sarPassTime: caseData.sarPassTime,
          slickCentroid: caseData.observationCentroid,
          slickAreaKm2: caseData.slick?.areaKm2 ?? 14.8,
          driftDurationHours: caseData.slickAgeHours ?? 9.2,
          windSpeedKts: caseData.environmental?.windSpeedKts ?? 12,
          currentSpeedKts: caseData.environmental?.currentSpeedKts ?? 0.6,
        },
        candidates: (caseData.vessels || []).map((c) => ({
          rank: c.rank,
          vesselName: c.name,
          mmsi: c.mmsi,
          flag: c.flag,
          vesselType: c.type,
          confidence: c.confidence,
          dcpaKm: c.dcpa,
          tcpaSignedMin: c.tcpaSigned,
          aisContinuityPct: c.continuity,
          frechetKm: c.frechet,
          bordaScore: c.borda,
          status: c.rank === 1 ? "Attributed" : "Excluded",
        })),
        fullCaseRecord: caseData,
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WAKE_Attribution_Report_${caseData.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      showToast(`Exported ${caseData.id} dossier JSON (${(blob.size / 1024).toFixed(1)} KB)`);
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed. Check console for details.');
      setExportStatus('idle');
    }
  };

  return (
    <div className="w-full bg-white min-h-[calc(100vh-64px)] flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--ocean-1)] text-white px-4 py-3 rounded-[6px] shadow-lg flex items-center gap-2.5 font-mono text-xs border border-[var(--ocean-2)] animate-in fade-in slide-in-from-bottom-2 duration-200 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-8">
        {/* Page Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-default)]">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-1)] mt-1">
              Case Attribution Report
            </h1>
            <p className="text-sm text-[var(--text-2)] mt-1 max-w-3xl">
              Forensic audit summary compiling satellite SAR detection, Lagrangian trajectory convergence, kinematic vessel interpolation, and sensitivity validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              aria-label="Print or export PDF of attribution report"
            >
              {printStatus === 'active' ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Print Ready
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print / PDF
                </>
              )}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportJson}
              aria-label="Export complete case dossier as JSON"
            >
              {exportStatus === 'active' ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-300" />
                  Exported JSON
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-1.5" />
                  Export Dossier (JSON)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Dossier Body Stack */}
        <div className="mt-8 space-y-10">
          {/* Section 1: Verdict & Top Candidate Summary */}
          <div>
            <VerdictCard />
          </div>

          {/* Section 2: Evidentiary Classification & Continuity Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6">
              <EvidenceProvenanceBars />
            </div>
            <div className="lg:col-span-6">
              <AisContinuityGantt />
            </div>
          </div>

          {/* Section 3: Evidence Matrix (Shortlist Comparison) */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[var(--text-1)]">
                Multi-Candidate Evidence &amp; Exclusion Matrix
              </h3>
              <p className="text-sm text-[var(--text-2)] mt-1">
                Evaluation across spatial proximity, temporal window alignment, AIS continuity, and kinematic velocity bounds.
              </p>
            </div>
            <EvidenceMatrix />
          </div>

          {/* Section 4: Forward Fit Validation & Sensitivity Testing */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6">
              <ForwardFitValidation />
            </div>
            <div className="lg:col-span-6">
              <SensitivityTable />
            </div>
          </div>

          {/* Section 4B: Diagnostics Cards */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-6">
                <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] aspect-square flex flex-col p-4 sm:p-5 overflow-hidden shadow-sm">
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-1)] mb-3 shrink-0">
                    Forward Simulation
                  </h3>
                  <div className="flex-1 min-h-0 w-full rounded-[8px] overflow-hidden bg-white/70 border border-[var(--border-subtle)] flex items-center justify-center p-2">
                    <img
                      src={forwardSimulationImg}
                      alt="Forward Simulation — How spread out the oil is, over time"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-6">
                <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] aspect-square flex flex-col p-4 sm:p-5 overflow-hidden shadow-sm">
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-1)] mb-3 shrink-0">
                    Backward Simulation
                  </h3>
                  <div className="flex-1 min-h-0 w-full rounded-[8px] overflow-hidden bg-white/70 border border-[var(--border-subtle)] flex items-center justify-center p-2">
                    <img
                      src={backwardSimulationImg}
                      alt="Backward Simulation — How spread out the oil is, over time"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full">
              <Card className="min-h-[160px] bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px]" />
            </div>
          </div>

          {/* Section 5: Contradiction Check & Caveats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6">
              <ContradictionCard />
            </div>
            <div className="lg:col-span-6">
              <LimitationsAccordion />
            </div>
          </div>

          {/* Section 6: Audit Trail & Integrity Sign-Off */}
          <div>
            <AuditTrailTable />
          </div>
        </div>

        <JourneyFooter />
      </div>

      <Footer />
    </div>
  );
};
