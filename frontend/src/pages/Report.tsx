import React, { useState } from 'react';
import {
  Download,
  Printer,
  Copy,
  Check,
  MapPin,
  Calendar,
  Layers,
  Radio,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useCase } from '../context/CaseContext';
import { EvidenceMatrix } from '../components/report/EvidenceMatrix';
import { VerdictCard } from '../components/report/VerdictCard';
import { AttributionRadarChart } from '../components/report/AttributionRadarChart';
import { EvidenceProvenanceBars } from '../components/report/EvidenceProvenanceBars';
import { AisContinuityGantt } from '../components/report/AisContinuityGantt';
import { ContradictionCard } from '../components/report/ContradictionCard';
import { SensitivityTable } from '../components/report/SensitivityTable';
import { ForwardFitValidation } from '../components/report/ForwardFitValidation';
import { LimitationsAccordion } from '../components/report/LimitationsAccordion';
import { AuditTrailTable } from '../components/report/AuditTrailTable';
import { BaseMap } from '../components/maps/BaseMap';
import { Button, Card, EvidenceLegend } from '../components/ui';
import { RouteGuard } from '../components/shared/RouteGuard';
import { JourneyFooter } from '../components/shared/JourneyFooter';
import { MALIBU_CASE } from '../data/malibuCase';

export const Report: React.FC = () => {
  const { caseData, selectedVessel, selectedVesselId, setSelectedVesselId } = useCase();
  const [copied, setCopied] = useState(false);

  // Map layer controls for the embedded dossier map
  const [activeLayers, setActiveLayers] = useState({
    sarFootprint: true,
    slickPolygon: true,
    releaseEllipse: true,
    hindcastParticles: true,
    vesselTracks: true,
    aisGaps: true,
    depthContours: false,
  });

  const handleToggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleCopySummary = () => {
    const summary = `
=== WAKE FORENSIC VESSEL ATTRIBUTION DOSSIER ===
SIMULATED DEMONSTRATION DOSSIER
CASE: ${caseData.id}
LOCATION: Santa Monica Bay, off Malibu (34.0169°N, 118.6631°W)
OBSERVATION TIME: 2024-08-06 01:50:00 UTC (Sentinel-1 IW · VV+VH)
OBSERVED SLICK: 11.6 km length, 4.7 km² area (DeepLabV3+ segmentation)
INFERRED RELEASE EPOCH: 2024-08-05 16:40:00 UTC (T−9.2 h age)
INFERRED RELEASE POINT: 34.0080°N, 118.7310°W (95% ellipse: 3.1 × 1.9 km)

LEAD ATTRIBUTION CANDIDATE:
1. ${caseData.vessels[0].name} (MMSI: ${caseData.vessels[0].mmsi})
   - Borda Consensus Score: ${caseData.vessels[0].borda}/20
   - Distance at Closest Point of Approach (DCPA): ${caseData.vessels[0].dcpa} km (DERIVED)
   - Time to Closest Point of Approach (|TCPA|): ${caseData.vessels[0].tcpa} min (DERIVED)
   - Discrete Fréchet Distance: ${caseData.vessels[0].frechet} km (DERIVED)
   - AIS Transmission Continuity: ${caseData.vessels[0].continuity}% (DERIVED)
   - Attribution Confidence: ${(caseData.vessels[0].confidence * 100).toFixed(0)}% (Moderate-High)

FLAGGED CONTRADICTION:
2. MV Pacific Lantern (MMSI: ${caseData.vessels[1].mmsi})
   - Optimal temporal proximity (|TCPA| 9 min) contradicted by a 38-minute transponder silence (16:25–17:03 UTC) covering the inferred release epoch.

DISCLAIMER:
Investigative decision support only. Attribution leads are not legal findings.
All data is simulated; all vessels fictional.
    `.trim();

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportJSON = () => {
    // Documented schema export built directly from canonical MALIBU_CASE
    const exportBundle = {
      $schema: 'https://wake-marine.internal/schemas/v1/attribution-dossier.json',
      caseMetadata: {
        id: MALIBU_CASE.id,
        name: MALIBU_CASE.name,
        seaArea: MALIBU_CASE.seaArea,
        exportedAtUtc: new Date().toISOString(),
        disclaimer: 'Investigative decision support only. Attribution leads are not legal findings. All data simulated.',
      },
      sarObservation: {
        sensor: MALIBU_CASE.sarSensor,
        mode: 'IW (Interferometric Wide)',
        polarisation: 'VV + VH',
        acquisitionUtc: MALIBU_CASE.sarPassTime,
        observedCentroid: MALIBU_CASE.observationCentroid,
        slickGeometry: {
          lengthKm: MALIBU_CASE.slick.lengthKm,
          widthKm: MALIBU_CASE.slick.widthKm,
          areaKm2: MALIBU_CASE.slick.areaKm2,
          orientationDeg: MALIBU_CASE.slick.orientationDeg,
          verticesCount: MALIBU_CASE.slick.vertices.length,
        },
      },
      reverseDriftInference: {
        engine: 'OpenDrift Lagrangian Backward Advection',
        releaseEpochUtc: MALIBU_CASE.inferredReleaseEpoch,
        driftAgeHours: MALIBU_CASE.slickAgeHours,
        inferredReleaseCentroid: MALIBU_CASE.inferredReleasePoint,
        confidenceEllipse95: MALIBU_CASE.errorEllipse95,
        forcingFields: MALIBU_CASE.environmental,
      },
      candidateAttributionMatrix: caseData.vessels.map((v) => ({
        rank: v.rank,
        name: v.name,
        mmsi: v.mmsi,
        type: v.type,
        flag: v.flag,
        metrics: {
          dcpaKm: v.dcpa,
          tcpaMinutes: v.tcpa,
          frechetKm: v.frechet,
          aisContinuityPct: v.continuity,
        },
        bordaScore: v.borda,
        attributionConfidence: v.confidence,
        provenanceBreakdown: v.provenance,
        contradictionAlert: v.contradiction || null,
      })),
      sensitivityRobustness: MALIBU_CASE.rankStability,
      auditSignatures: {
        hashAlgorithm: 'SHA-256',
        pipelineRevision: 'wake-v1.4.2-mlb-20240806',
        caseBundleArchive: 'results/malibu_case/',
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${MALIBU_CASE.id}_forensic_dossier.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <RouteGuard>
      <div className="max-w-[var(--page-max)] mx-auto px-[var(--page-pad)] py-6 space-y-6">
        {/* HEADER ROW */}
        <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Neutral badge: SIMULATED DEMONSTRATION DOSSIER */}
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)] border border-[var(--border-strong)] px-2.5 py-0.5 rounded-[4px] bg-[var(--surface-2)]">
                SIMULATED DEMONSTRATION DOSSIER
              </span>
              <span className="font-mono text-xs text-[var(--text-3)]">
                CASE: {caseData.id}
              </span>
            </div>

            <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[var(--text-1)]">
              Forensic Vessel Attribution Dossier
            </h1>

            <p className="font-mono text-xs text-[var(--text-3)]">
              Case WAKE-2024-0806-MLB · Santa Monica Bay, off Malibu · Observed 2024-08-06 01:50:00 UTC
            </p>

            {/* One-line disclaimer */}
            <p className="font-sans text-xs text-[var(--text-2)] italic pt-0.5">
              Investigative decision support only. Attribution leads are not legal findings.
            </p>
          </div>

          {/* Action Buttons: COPY BRIEF, EXPORT JSON, PRINT DOSSIER */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopySummary}
              icon={copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {copied ? 'Copied Brief' : 'COPY BRIEF'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportJSON}
              icon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              EXPORT JSON
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              icon={<Printer className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              PRINT DOSSIER
            </Button>
          </div>
        </div>

        {/* 1. SUMMARY TILES (4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Tile 1: Incident Identifier */}
          <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-4 space-y-1">
            <span className="text-[var(--text-3)] font-mono block uppercase tracking-wider text-xs font-semibold">
              INCIDENT IDENTIFIER
            </span>
            <div className="font-mono font-bold text-sm text-[var(--text-1)]">
              {caseData.id}
            </div>
            <div className="text-[var(--text-3)] font-sans text-xs">
              Santa Monica Bay · off Malibu
            </div>
          </Card>

          {/* Tile 2: Sensor */}
          <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-4 space-y-1">
            <span className="text-[var(--text-3)] font-mono block uppercase tracking-wider text-xs font-semibold">
              SAR SENSOR
            </span>
            <div className="font-mono font-bold text-sm text-[var(--text-1)]">
              Sentinel-1 IW · VV+VH
            </div>
            <div className="text-[var(--text-3)] font-sans text-xs">
              Acquired 01:50:00 UTC (Slick 4.7 km²)
            </div>
          </Card>

          {/* Tile 3: Inferred Release (Pink dotted style) */}
          <Card className="bg-[var(--surface-1)] border-2 border-dotted border-[var(--inferred)] p-4 space-y-1">
            <span className="text-[var(--inferred)] font-mono block uppercase tracking-wider text-xs font-bold">
              INFERRED RELEASE
            </span>
            <div className="font-mono font-bold text-sm text-[var(--text-1)]">
              16:40:00 UTC · age 9.2 h
            </div>
            <div className="text-[var(--text-3)] font-sans text-xs">
              34.0080°N, 118.7310°W (95% ellipse)
            </div>
          </Card>

          {/* Tile 4: Lead Candidate */}
          <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-4 space-y-1">
            <span className="text-[var(--text-3)] font-mono block uppercase tracking-wider text-xs font-semibold">
              LEAD CANDIDATE
            </span>
            <div className="font-mono font-bold text-sm text-[var(--violet-300)]">
              {caseData.vessels[0].name}
            </div>
            <div className="text-[var(--text-3)] font-sans text-xs">
              Borda 18/20 · confidence 0.74 (Moderate-High)
            </div>
          </Card>
        </div>

        {/* 2. VERDICT CARD */}
        <VerdictCard />

        {/* 3. CANDIDATE ATTRIBUTION MATRIX */}
        <EvidenceMatrix />

        {/* 4. TWO-COLUMN: MAP AND RADAR CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: Map Card */}
          <Card className="bg-[var(--surface-1)] border-[var(--border-default)] p-4 flex flex-col justify-between shadow-2xl h-full min-h-[460px]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--violet-400)]" />
                  <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-[var(--text-1)]">
                    SPATIAL RECONSTRUCTION & CPA
                  </h3>
                </div>
                <p className="font-mono text-xs text-[var(--text-3)] mt-0.5">
                  Selected: <strong className="text-[var(--violet-300)]">{selectedVessel.name}</strong> (#{selectedVessel.rank}) · DCPA connector & closest approach
                </p>
              </div>

              {/* Compact Legend embedded */}
              <div className="hidden sm:block">
                <EvidenceLegend compact />
              </div>
            </div>

            {/* BaseMap container */}
            <div className="w-full h-[360px] my-2 rounded-[6px] overflow-hidden border border-[var(--border-default)] relative">
              <BaseMap
                selectedVesselId={selectedVesselId}
                onSelectVessel={setSelectedVesselId}
                activeLayers={activeLayers}
                onToggleLayer={handleToggleLayer}
                height={360}
                timeCursor={1.0}
                minimal={false}
                showControls={true}
              />
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-3)] flex items-center justify-between">
              <span>Amber dashed vector: Distance at Closest Point of Approach (DCPA)</span>
              <span className="text-[var(--text-2)] font-semibold">{selectedVessel.dcpa.toFixed(1)} km</span>
            </div>
          </Card>

          {/* Right: Attribution Radar Chart */}
          <AttributionRadarChart />
        </div>

        {/* 5. EVIDENCE PROVENANCE PER VESSEL */}
        <EvidenceProvenanceBars />

        {/* 6. AIS CONTINUITY TIMELINE */}
        <AisContinuityGantt />

        {/* 7. CONTRADICTION CARD */}
        <ContradictionCard />

        {/* 8. SENSITIVITY & RANK STABILITY */}
        <SensitivityTable />

        {/* 9. FORWARD-FIT VALIDATION */}
        <ForwardFitValidation />

        {/* 10. LIMITATIONS & METHOD NOTES */}
        <LimitationsAccordion />

        {/* 11. AUDIT TRAIL */}
        <AuditTrailTable />

        {/* 12. JourneyFooter */}
        <JourneyFooter />
      </div>
    </RouteGuard>
  );
};
