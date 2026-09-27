import React, { useState } from 'react';
import { useCase } from '../../../context/CaseContext';
import { Compass, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';

interface EvidenceGraphTabProps {
  onFlyTo?: (target: 'slick' | 'release' | string) => void;
}

export const EvidenceGraphTab: React.FC<EvidenceGraphTabProps> = ({ onFlyTo }) => {
  const { caseData, selectedVesselId, setSelectedVesselId } = useCase();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const vessels = caseData.vessels;

  // Handler for node selection + 3D camera fly-to
  const handleNodeClick = (nodeId: string) => {
    if (nodeId === 'slick') {
      onFlyTo?.('slick');
    } else if (nodeId === 'hindcast' || nodeId === 'release') {
      onFlyTo?.('release');
    } else {
      // It's a vessel
      setSelectedVesselId(nodeId);
      onFlyTo?.(nodeId);
    }
  };

  const selectedNode = hoveredNode || selectedVesselId || 'v1';

  return (
    <div className="flex flex-col h-full bg-[#0b101b] text-neutral-200 select-none overflow-y-auto">
      {/* Header Info */}
      <div className="p-3.5 border-b border-neutral-800 bg-[#0d1322]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
            Bayesian Provenance Network
          </span>
          <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
            Interactive Topology
          </span>
        </div>
        <p className="text-xs text-neutral-400 leading-normal">
          Click any node to select the attribution entity and fly the 3D camera to its spatial
          coordinates.
        </p>
      </div>

      {/* SVG Interactive Canvas */}
      <div className="px-2 py-3 flex-1 flex flex-col items-center justify-start">
        <svg
          viewBox="0 0 340 520"
          className="w-full max-w-[340px] h-auto drop-shadow-sm"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Markers for arrows */}
            <marker
              id="arrow-teal"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#2DD4BF" />
            </marker>
            <marker
              id="arrow-pink"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#F472B6" />
            </marker>
            <marker
              id="arrow-violet"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#8E7BFF" />
            </marker>
            <marker
              id="arrow-amber"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
            </marker>
          </defs>

          {/* Connectors */}
          {/* Slick -> Hindcast */}
          <path
            d="M 170 48 L 170 96"
            fill="none"
            stroke="#2DD4BF"
            strokeWidth="2"
            markerEnd="url(#arrow-teal)"
            strokeDasharray="4 3"
          />
          <text
            x="180"
            y="74"
            fill="#2DD4BF"
            fontSize="12"
            fontFamily="monospace"
            className="select-none pointer-events-none"
          >
            Advection
          </text>

          {/* Hindcast -> Release Corridor */}
          <path
            d="M 170 144 L 170 192"
            fill="none"
            stroke="#F472B6"
            strokeWidth="2"
            strokeDasharray="3 3"
            markerEnd="url(#arrow-pink)"
          />
          <text
            x="180"
            y="170"
            fill="#F472B6"
            fontSize="12"
            fontFamily="monospace"
            className="select-none pointer-events-none"
          >
            -9.2h Ellipse
          </text>

          {/* Release Corridor -> 6 Vessels */}
          {vessels.map((v, i) => {
            const destX = 35 + (i % 2 === 0 ? 30 : 180);
            const destY = 270 + Math.floor(i / 2) * 80;
            const isLead = v.id === 'v1';
            const isContradiction = v.id === 'v2';
            const isSelected = selectedVesselId === v.id;

            const strokeColor = isLead ? '#8E7BFF' : isContradiction ? '#EF4444' : '#F59E0B';
            const strokeWidth = isSelected ? 2.5 : isLead ? 2 : 1.2;
            const marker = isLead ? 'url(#arrow-violet)' : 'url(#arrow-amber)';

            // Draw curved path
            const controlY = 230;
            return (
              <g key={`edge-${v.id}`}>
                <path
                  d={`M 170 238 C 170 ${controlY}, ${destX + 50} ${controlY}, ${destX + 50} ${destY}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isLead ? 'none' : '4 3'}
                  opacity={isSelected || hoveredNode === v.id ? 1 : 0.7}
                  markerEnd={marker}
                />
              </g>
            );
          })}

          {/* Root Node: Observed Slick */}
          <g
            transform="translate(85, 12)"
            className="cursor-pointer group"
            onClick={() => handleNodeClick('slick')}
            onMouseEnter={() => setHoveredNode('slick')}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <rect
              width="170"
              height="36"
              rx="6"
              fill="#0d2426"
              stroke="#2DD4BF"
              strokeWidth={hoveredNode === 'slick' ? 2 : 1.5}
            />
            <circle cx="16" cy="18" r="5" fill="#2DD4BF" />
            <text x="30" y="16" fill="#A7F3D0" fontSize="12" fontWeight="600">
              SAR Slick Polygon
            </text>
            <text x="30" y="28" fill="#5EEAD4" fontSize="12" fontFamily="monospace">
              Observed · 01:50Z
            </text>
          </g>

          {/* Step 1 Node: OpenDrift Hindcast */}
          <g
            transform="translate(75, 96)"
            className="cursor-pointer group"
            onClick={() => handleNodeClick('hindcast')}
            onMouseEnter={() => setHoveredNode('hindcast')}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <rect
              width="190"
              height="48"
              rx="6"
              fill="#26101c"
              stroke="#F472B6"
              strokeWidth={hoveredNode === 'hindcast' ? 2 : 1.5}
            />
            <circle cx="16" cy="24" r="5" fill="#F472B6" />
            <text x="30" y="20" fill="#FBCFE8" fontSize="12" fontWeight="600">
              Lagrangian Hindcast
            </text>
            <text x="30" y="34" fill="#F472B6" fontSize="12" fontFamily="monospace">
              Inferred · 1,500 particles
            </text>
          </g>

          {/* Step 2 Node: Inferred Release Corridor */}
          <g
            transform="translate(65, 192)"
            className="cursor-pointer group"
            onClick={() => handleNodeClick('release')}
            onMouseEnter={() => setHoveredNode('release')}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <rect
              width="210"
              height="46"
              rx="6"
              fill="#26101c"
              stroke="#F472B6"
              strokeWidth={hoveredNode === 'release' ? 2 : 1.5}
              strokeDasharray="4 2"
            />
            <circle cx="16" cy="23" r="5" fill="#F472B6" />
            <text x="30" y="19" fill="#FCE7F3" fontSize="12" fontWeight="600">
              Release Corridor (95%)
            </text>
            <text x="30" y="33" fill="#F472B6" fontSize="12" fontFamily="monospace">
              16:40 UTC · ±0.8 km
            </text>
          </g>

          {/* 6 Vessel Nodes */}
          {vessels.map((v, i) => {
            const posX = 15 + (i % 2 === 0 ? 0 : 160);
            const posY = 270 + Math.floor(i / 2) * 80;
            const isSelected = selectedVesselId === v.id;
            const isHovered = hoveredNode === v.id;
            const isLead = v.id === 'v1';
            const isContradiction = v.id === 'v2';

            const borderColor = isSelected
              ? '#8E7BFF'
              : isLead
              ? '#8E7BFF'
              : isContradiction
              ? '#EF4444'
              : '#374151';

            const bgColor = isSelected
              ? '#1f1a3a'
              : isLead
              ? '#17142b'
              : isContradiction
              ? '#2a1215'
              : '#111827';

            return (
              <g
                key={v.id}
                transform={`translate(${posX}, ${posY})`}
                className="cursor-pointer"
                onClick={() => handleNodeClick(v.id)}
                onMouseEnter={() => setHoveredNode(v.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <rect
                  width="150"
                  height="66"
                  rx="6"
                  fill={bgColor}
                  stroke={borderColor}
                  strokeWidth={isSelected || isHovered ? 2 : 1}
                />
                {/* Status indicator */}
                <circle
                  cx="12"
                  cy="16"
                  r="4"
                  fill={isLead ? '#8E7BFF' : isContradiction ? '#EF4444' : '#9CA3AF'}
                />
                <text
                  x="22"
                  y="18"
                  fill={isSelected || isLead ? '#FFFFFF' : '#E5E7EB'}
                  fontSize="12"
                  fontWeight="600"
                >
                  {v.name.length > 15 ? v.name.substring(0, 14) + '…' : v.name}
                </text>
                <text x="12" y="36" fill="#9CA3AF" fontSize="12" fontFamily="monospace">
                  Rank #{v.rank} · Borda {v.borda}/20
                </text>
                <text
                  x="12"
                  y="52"
                  fill={isContradiction ? '#F87171' : '#D1D5DB'}
                  fontSize="12"
                  fontFamily="monospace"
                >
                  {isContradiction
                    ? '⚠️ 38m AIS Gap'
                    : `DCPA ${v.dcpa.toFixed(1)}km · ${v.tcpa}m`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected / Hovered Detail Inspector */}
      <div className="p-3 border-t border-neutral-800 bg-[#090e18]">
        <div className="text-xs font-mono text-neutral-400 mb-1.5 flex items-center justify-between">
          <span>INSPECTED GRAPH VERTEX:</span>
          {onFlyTo && (
            <span className="text-violet-400 flex items-center gap-0.5">
              Fly 3D Camera <ChevronRight className="w-3 h-3" />
            </span>
          )}
        </div>
        {selectedNode === 'slick' ? (
          <div className="text-xs space-y-1 bg-[#121829] p-2.5 rounded border border-teal-500/30">
            <div className="text-teal-300 font-semibold text-[13px]">
              Sentinel-1 SAR Surface Slick
            </div>
            <div className="text-neutral-300">
              Polygon Area: 4.8 km² · Acquired: 2024-08-06 01:50:00 UTC
            </div>
            <div className="text-neutral-400 font-mono text-xs">
              Class: [OBSERVED] Spaceborne Synthetic Aperture Radar
            </div>
          </div>
        ) : selectedNode === 'hindcast' || selectedNode === 'release' ? (
          <div className="text-xs space-y-1 bg-[#121829] p-2.5 rounded border border-pink-500/30">
            <div className="text-pink-300 font-semibold text-[13px]">
              Lagrangian Hindcast Dispersion
            </div>
            <div className="text-neutral-300">
              Advected 9.2 hours backwards via coastal ROMS & HRRR winds.
            </div>
            <div className="text-neutral-400 font-mono text-xs">
              Class: [INFERRED] Release corridor 16:40 UTC (±15 min)
            </div>
          </div>
        ) : (
          (() => {
            const v = vessels.find((item) => item.id === selectedNode) || vessels[0];
            const sog = (v.track?.[v.track.length - 1]?.sog ?? 14.2).toFixed(1);
            const cog = (v.track?.[v.track.length - 1]?.cog ?? 285).toFixed(0);
            return (
              <div className="text-xs space-y-1 bg-[#121829] p-2.5 rounded border border-violet-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-violet-300 font-semibold text-[13px]">
                    {v.name} (Rank #{v.rank})
                  </span>
                  <span className="font-mono text-violet-400">{v.borda} pts</span>
                </div>
                <div className="text-neutral-300 font-mono text-xs">
                  DCPA: {v.dcpa.toFixed(1)} km · TCPA: {v.tcpa} min · Fréchet:{' '}
                  {v.frechet.toFixed(1)} km
                </div>
                <div className="text-neutral-400 font-mono text-xs">
                  Continuity: {v.continuity}% · SOG: {sog} kn · COG: {cog}°
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};
