/**
 * Copilot Analytical Engine for WAKE Maritime Forensics
 * Encapsulates deterministic scripted reasoning over Malibu Case Data.
 * Structure ready for direct Gemini / Interactions API integration.
 */

import { MalibuCaseData } from '../data/malibuCase';

export interface EvidenceChip {
  type: 'observed' | 'derived' | 'inferred' | 'attribution';
  label: string;
}

export interface CopilotResponse {
  id: string;
  answer: string;
  chips: EvidenceChip[];
  timestamp: string;
  contradictionAlert?: {
    vesselName: string;
    title: string;
    description: string;
    metrics: string;
  };
}

export interface ScenarioDiff {
  parameter: string;
  leadVessel: string;
  leadScore: number;
  runnerUp: string;
  runnerUpScore: number;
  deltaText: string;
  isRankSwap: boolean;
  scoreMap: Record<string, number>;
  timestamp: string;
}

export const SUGGESTED_QUESTIONS = [
  'Why is MV Meridian Crest ranked #1?',
  'Any contradictions?',
  'What if the release epoch shifts?',
  'How confident is this?',
];

/**
 * Scripted answer engine based strictly on forensic case data.
 */
export function askCopilot(
  question: string,
  caseData: MalibuCaseData,
  activeDiff?: ScenarioDiff | null
): CopilotResponse {
  const q = question.toLowerCase().trim();
  const timestamp = new Date().toISOString().substring(11, 19) + ' UTC';

  // 1. Why is MV Meridian Crest ranked #1?
  if (
    q.includes('meridian crest') ||
    q.includes('ranked #1') ||
    q.includes('ranked 1') ||
    q.includes('why is') ||
    q.includes('top vessel')
  ) {
    return {
      id: `ans-${Date.now()}`,
      answer:
        'It leads on DCPA (1.8 km) and Fréchet distance (2.9 km) and is second on TCPA (12 min) and AIS continuity (97%), giving Borda 18/20, four points ahead of MV Pacific Lantern (14/20).',
      chips: [
        { type: 'derived', label: 'DCPA 1.8 km' },
        { type: 'derived', label: 'Fréchet 2.9 km' },
        { type: 'derived', label: 'TCPA 12 min' },
        { type: 'derived', label: 'Continuity 97%' },
        { type: 'inferred', label: 'Borda 18/20' },
      ],
      timestamp,
    };
  }

  // 2. Any contradictions?
  if (
    q.includes('contradiction') ||
    q.includes('discrepanc') ||
    q.includes('gap') ||
    q.includes('blackout') ||
    q.includes('pacific lantern')
  ) {
    const v2 = caseData.vessels.find((v) => v.id === 'v2');
    return {
      id: `ans-${Date.now()}`,
      answer:
        'Contradiction detected for MV Pacific Lantern. It has the closest temporal approach (|TCPA| = 9 min), but underwent a 38-minute AIS silence blackout (16:25 to 17:03 UTC) directly overlapping the 16:40Z release window. Spatial-temporal proximity is strong, but observational continuity is severely degraded.',
      chips: [
        { type: 'derived', label: 'TCPA 9 min' },
        { type: 'observed', label: 'AIS Blackout 38m' },
        { type: 'inferred', label: 'Release Epoch 16:40Z' },
        { type: 'attribution', label: 'Divergence Flag' },
      ],
      contradictionAlert: {
        vesselName: v2?.name || 'MV Pacific Lantern',
        title: 'Temporal Proximity vs. Transmission Blackout',
        description:
          'While kinematic trajectory passes within 2.9 km of the inferred spill core at 16:31Z, transponder silence between 16:25Z and 17:03Z prevents independent broadcast corroboration.',
        metrics: 'TCPA: 9 min · Gap: 38 min · Continuity: 62%',
      },
      timestamp,
    };
  }

  // 3. What if the release epoch shifts?
  if (
    q.includes('epoch') ||
    q.includes('shift') ||
    q.includes('sensitivity') ||
    q.includes('perturb') ||
    q.includes('timing')
  ) {
    return {
      id: `ans-${Date.now()}`,
      answer:
        'At +25 minutes (17:05 UTC) MV Pacific Lantern overtakes MV Meridian Crest by 2 points (17 vs 15 Borda points). The other six hydrodynamic perturbations (±20% wind, ±20% ocean current, ±25% drift spread) keep MV Meridian Crest consistently in first position.',
      chips: [
        { type: 'inferred', label: 'Release Epoch +25m' },
        { type: 'inferred', label: 'Rank Flip: Pacific Lantern #1' },
        { type: 'derived', label: '6/7 Perturbations Stable' },
      ],
      timestamp,
    };
  }

  // 4. How confident is this?
  if (
    q.includes('confident') ||
    q.includes('confidence') ||
    q.includes('certain') ||
    q.includes('score') ||
    q.includes('reliability')
  ) {
    return {
      id: `ans-${Date.now()}`,
      answer:
        'Confidence is 0.74 (Moderate-High), but the lead depends on the release-epoch estimate. All values are simulated demonstration data for investigative decision support.',
      chips: [
        { type: 'inferred', label: 'Confidence 0.74' },
        { type: 'derived', label: 'Simulated Data' },
        { type: 'attribution', label: 'Decision Support Only' },
      ],
      timestamp,
    };
  }

  // 5. Inquire about active Scenario Lab changes if any
  if (activeDiff && (q.includes('scenario') || q.includes('change') || q.includes('lab'))) {
    return {
      id: `ans-${Date.now()}`,
      answer: `Current Scenario Lab configuration evaluates "${activeDiff.parameter}". Resulting standings: ${activeDiff.leadVessel} (${activeDiff.leadScore} pts) leads ${activeDiff.runnerUp} (${activeDiff.runnerUpScore} pts) with delta ${activeDiff.deltaText}.${activeDiff.isRankSwap ? ' Attribution rank swap triggered.' : ' Ranking remains stable.'}`,
      chips: [
        { type: 'inferred', label: activeDiff.parameter },
        { type: 'inferred', label: activeDiff.isRankSwap ? 'Rank Swap' : 'Stable' },
        { type: 'attribution', label: activeDiff.deltaText },
      ],
      timestamp,
    };
  }

  // Fallback
  return {
    id: `ans-${Date.now()}`,
    answer:
      "I can answer questions about this case's ranking, evidence, gaps and sensitivity. Select a prompt below or ask about candidate vessels, AIS blackout intervals, or hydrodynamic perturbations.",
    chips: [
      { type: 'inferred', label: 'Borda Consensus' },
      { type: 'derived', label: 'Kinematic Metric' },
      { type: 'observed', label: 'SAR / AIS' },
    ],
    timestamp,
  };
}
