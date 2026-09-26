import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Circle,
  CircleMarker,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MALIBU_CASE,
  COASTLINE_LAND_POLYGON,
  INFERRED_RELEASE_POINT,
  particlesAt,
  positionAt,
  closestApproach,
} from '../../data/malibuCase';
import { Eye, EyeOff, AlertCircle, Layers, Check } from 'lucide-react';
import { MapLayers } from '../../context/CaseContext';

// S1 Synthetic Aperture Radar Swath Footprint Scene Outline
const S1_SWATH_FOOTPRINT: [number, number][] = [
  [34.18, -118.95],
  [34.22, -118.50],
  [33.80, -118.40],
  [33.74, -118.86],
];

// Custom Chevron SVG Icon generator for oriented vessel headings
function createChevronIcon(cog: number, isSelected: boolean) {
  const color = isSelected ? '#8E7BFF' : '#9E9EB8';
  const size = isSelected ? 28 : 20;

  const svg = `
    <div style="transform: rotate(${cog}deg); width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L20 20L12 16L4 20L12 2Z" fill="${color}" stroke="${isSelected ? '#FFFFFF' : '#000000'}" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svg,
    className: 'vessel-heading-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Origin Crosshair Pin Icon
function createOriginIcon(isDraggable: boolean) {
  const color = isDraggable ? '#C4B5FD' : '#8E7BFF';
  const svg = `
    <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${color}; background: #000000; box-shadow: 0 0 10px rgba(142, 123, 255, 0.6); display: flex; align-items: center; justify-content: center;">
        <div style="width: 4px; height: 4px; border-radius: 50%; background: ${color};"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svg,
    className: 'origin-crosshair-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Map Controller for auto-fit bounds on mount & track selection
const MapController: React.FC<{
  selectedVesselId: string | null;
}> = ({ selectedVesselId }) => {
  const map = useMap();
  const initialFitDone = useRef(false);

  useEffect(() => {
    if (!initialFitDone.current) {
      const points: [number, number][] = [
        [MALIBU_CASE.inferredReleasePoint.lat, MALIBU_CASE.inferredReleasePoint.lon],
        [MALIBU_CASE.observationCentroid.lat, MALIBU_CASE.observationCentroid.lon],
        ...MALIBU_CASE.slick.vertices.map((v): [number, number] => [v.lat, v.lon]),
      ];

      MALIBU_CASE.vessels.forEach((v) => {
        const cpa = closestApproach(v.id);
        points.push([cpa.lat, cpa.lon]);
      });

      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      initialFitDone.current = true;
    }
  }, [map]);

  useEffect(() => {
    if (selectedVesselId) {
      const v = MALIBU_CASE.vessels.find((x) => x.id === selectedVesselId);
      if (v && v.track && v.track.length > 0) {
        const cpa = closestApproach(v.id);
        map.panTo([cpa.lat, cpa.lon], { animate: true, duration: 0.6 });
      }
    }
  }, [map, selectedVesselId]);

  return null;
};

// Map click listener for interactive coordinate picking
const MapClickHandler: React.FC<{
  enabled: boolean;
  onPick: (lat: number, lon: number) => void;
}> = ({ enabled, onPick }) => {
  const map = useMap();

  useEffect(() => {
    if (enabled) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [enabled, map]);

  useMapEvents({
    click(e) {
      if (enabled) {
        onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      }
    },
  });

  return null;
};

// Graticule Lines (1px rgba(255,255,255,0.08))
const GraticuleOverlay: React.FC = () => {
  const lats = [33.95, 34.00, 34.05, 34.10];
  const lons = [-118.85, -118.80, -118.75, -118.70, -118.65, -118.60, -118.55, -118.50, -118.45];

  return (
    <>
      {lats.map((lat) => (
        <Polyline
          key={`lat-${lat}`}
          positions={[
            [lat, -118.90],
            [lat, -118.40],
          ]}
          pathOptions={{
            color: 'rgba(255,255,255,0.08)',
            weight: 1,
            dashArray: '4, 4',
            interactive: false,
          }}
        />
      ))}
      {lons.map((lon) => (
        <Polyline
          key={`lon-${lon}`}
          positions={[
            [33.90, lon],
            [34.15, lon],
          ]}
          pathOptions={{
            color: 'rgba(255,255,255,0.08)',
            weight: 1,
            dashArray: '4, 4',
            interactive: false,
          }}
        />
      ))}
    </>
  );
};

// ESRI TileLayer with automatic fallback
const TileLayerWithFallback: React.FC<{
  onTileError: () => void;
}> = ({ onTileError }) => {
  return (
    <TileLayer
      url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      attribution='Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors'
      maxZoom={16}
      eventHandlers={{
        tileerror: () => {
          onTileError();
        },
      }}
    />
  );
};

export interface BaseMapProps {
  originLat?: number;
  originLon?: number;
  spreadKm?: number;
  pickOnMap?: boolean;
  onPickLocation?: (lat: number, lon: number) => void;
  isRunDone?: boolean;
  selectedVesselId?: string | null;
  onSelectVessel?: (id: string) => void;
  timeCursor?: number;
  activeLayers?: MapLayers;
  onToggleLayer?: (layer: keyof MapLayers) => void;
  height?: string | number;
  className?: string;
  showControls?: boolean;
  minimal?: boolean;
}

export const BaseMap: React.FC<BaseMapProps> = ({
  originLat = MALIBU_CASE.observationCentroid.lat,
  originLon = MALIBU_CASE.observationCentroid.lon,
  spreadKm = 12.0,
  pickOnMap = false,
  onPickLocation,
  isRunDone = true,
  selectedVesselId = null,
  onSelectVessel,
  timeCursor = 1.0,
  activeLayers = {
    sarFootprint: true,
    slickPolygon: true,
    releaseEllipse: true,
    hindcastParticles: true,
    vesselTracks: true,
    aisGaps: true,
    depthContours: false,
  },
  onToggleLayer,
  height = '100%',
  className = '',
  showControls = true,
  minimal = false,
}) => {
  const containerHeight = typeof height === 'number' ? `${height}px` : height;
  const [basemapMode, setBasemapMode] = useState<'esri' | 'off'>('esri');
  const [layerMenuOpen, setLayerMenuOpen] = useState<boolean>(false);
  const [tileErrorCount, setTileErrorCount] = useState<number>(0);
  const [fallbackNoticeVisible, setFallbackNoticeVisible] = useState<boolean>(false);

  const handleTileError = () => {
    setTileErrorCount((prev) => {
      const next = prev + 1;
      if (next >= 3 && basemapMode === 'esri') {
        setBasemapMode('off');
        setFallbackNoticeVisible(true);
      }
      return next;
    });
  };

  const particles = useMemo(() => {
    if (!isRunDone) return [];
    return particlesAt(timeCursor);
  }, [timeCursor, isRunDone]);

  const currentTimestampMs = useMemo(() => {
    const releaseMs = new Date('2024-08-05T16:40:00Z').getTime();
    return releaseMs + (timeCursor * 9.2 * 3600 * 1000 * 0.15);
  }, [timeCursor]);

  // 95% Error Ellipse points
  const ellipsePoints = useMemo(() => {
    const c = MALIBU_CASE.inferredReleasePoint;
    const aKm = MALIBU_CASE.errorEllipse95.semiMajorKm;
    const bKm = MALIBU_CASE.errorEllipse95.semiMinorKm;
    const rotRad = (MALIBU_CASE.errorEllipse95.orientationDeg * Math.PI) / 180;

    const pts: [number, number][] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const u = Math.cos(theta) * aKm;
      const v = Math.sin(theta) * bKm;
      const xKm = u * Math.sin(rotRad) + v * Math.cos(rotRad);
      const yKm = u * Math.cos(rotRad) - v * Math.sin(rotRad);

      const lat = c.lat + yKm / 111.32;
      const lon = c.lon + xKm / 92.3;
      pts.push([lat, lon]);
    }
    return pts;
  }, []);

  // Slick polygon vertices
  const slickPositions = useMemo(() => {
    return MALIBU_CASE.slick.vertices.map((v): [number, number] => [v.lat, v.lon]);
  }, []);

  return (
    <div
      className={`relative w-full overflow-hidden select-none bg-[var(--bg-void)] ${className}`}
      style={{ height: containerHeight }}
    >
      <MapContainer
        center={[34.012, -118.70]}
        zoom={12}
        minZoom={10}
        maxZoom={16}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
        style={{ background: '#000000' }}
      >
        <MapController selectedVesselId={selectedVesselId} />

        {onPickLocation && (
          <MapClickHandler enabled={pickOnMap} onPick={onPickLocation} />
        )}

        {/* 1. ESRI Tile Layer or Tile-Free Coastline Mode */}
        {basemapMode === 'esri' ? (
          <TileLayerWithFallback onTileError={handleTileError} />
        ) : (
          <>
            <GraticuleOverlay />
            <Polygon
              positions={COASTLINE_LAND_POLYGON}
              pathOptions={{
                color: 'rgba(255,255,255,0.13)',
                fillColor: '#101018',
                fillOpacity: 0.95,
                weight: 1,
                interactive: false,
              }}
            />
          </>
        )}

        {/* 2. Sentinel-1 IW Swath Footprint Outline (Always visible) */}
        <Polygon
          positions={S1_SWATH_FOOTPRINT}
          pathOptions={{
            color: '#8E7BFF',
            weight: 1.5,
            dashArray: '6, 6',
            fillColor: '#8E7BFF',
            fillOpacity: 0.03,
            interactive: false,
          }}
        />

        {/* 3. Investigation Origin Marker & Spread Radius Circle */}
        <Circle
          center={[originLat, originLon]}
          radius={spreadKm * 1000}
          pathOptions={{
            color: '#8E7BFF',
            weight: 1.5,
            dashArray: '4, 4',
            fillColor: '#8E7BFF',
            fillOpacity: 0.05,
          }}
        >
          <Tooltip>
            <div className="font-mono text-xs">
              <span className="text-[var(--violet-400)] font-semibold">SEARCH SPREAD:</span>{' '}
              {spreadKm.toFixed(1)} km radius
            </div>
          </Tooltip>
        </Circle>

        <Marker
          position={[originLat, originLon]}
          draggable={pickOnMap}
          eventHandlers={{
            dragend: (e) => {
              if (onPickLocation) {
                const marker = e.target;
                const pos = marker.getLatLng();
                onPickLocation(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
              }
            },
          }}
          icon={createOriginIcon(pickOnMap)}
        >
          <Tooltip permanent={pickOnMap} direction="top">
            <div className="font-mono text-xs">
              <span className="text-[var(--violet-400)] font-bold">SPATIAL ORIGIN</span>
              <div>
                {originLat.toFixed(4)}°N, {Math.abs(originLon).toFixed(4)}°W
              </div>
              {pickOnMap && (
                <div className="text-[var(--warning)] font-sans text-xs">
                  (Drag marker or click map to move)
                </div>
              )}
            </div>
          </Tooltip>
        </Marker>

        {/* 4. POST-RUN EVIDENCE LAYERS (Visible only when isRunDone === true) */}
        {isRunDone && (
          <>
            {/* Observed Slick Polygon (Teal Solid 2px, 12% fill) */}
            {activeLayers.slickPolygon && (
              <>
                <Polygon
                  positions={slickPositions}
                  pathOptions={{
                    color: '#2DD4BF',
                    weight: 2,
                    fillColor: '#2DD4BF',
                    fillOpacity: 0.12,
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-mono text-xs text-[var(--text-1)]">
                      <div className="font-bold text-[var(--observed)] uppercase">
                        OBSERVED SLICK POLYGON
                      </div>
                      <div>Area: ~4.7 km² · Length: ~11.6 km</div>
                      <div className="text-[var(--text-3)]">SAR Sentinel-1 IW (01:50:00 UTC)</div>
                    </div>
                  </Tooltip>
                </Polygon>

                {/* Observed SAR Centroid Ring */}
                <CircleMarker
                  center={[MALIBU_CASE.observationCentroid.lat, MALIBU_CASE.observationCentroid.lon]}
                  radius={6}
                  pathOptions={{
                    color: '#2DD4BF',
                    weight: 2,
                    fillColor: '#000000',
                    fillOpacity: 0.8,
                  }}
                >
                  <Tooltip>
                    <span className="font-mono text-xs">SAR Slick Centroid (Observed)</span>
                  </Tooltip>
                </CircleMarker>
              </>
            )}

            {/* Inferred 95% Confidence Ellipse & Inferred Release Point */}
            {activeLayers.releaseEllipse && (
              <>
                <Polyline
                  positions={ellipsePoints}
                  pathOptions={{
                    color: '#F472B6',
                    weight: 2,
                    dashArray: '4, 6',
                    opacity: 0.9,
                  }}
                />

                <CircleMarker
                  center={[MALIBU_CASE.inferredReleasePoint.lat, MALIBU_CASE.inferredReleasePoint.lon]}
                  radius={6}
                  pathOptions={{
                    color: '#F472B6',
                    weight: 2,
                    fillColor: '#000000',
                    fillOpacity: 0.8,
                  }}
                >
                  <Tooltip permanent={!minimal}>
                    <div className="font-mono text-xs">
                      <span className="text-[var(--inferred)] font-semibold uppercase">
                        Inferred Release Point
                      </span>
                      <div className="text-[var(--text-3)]">16:40:00 UTC (T−9.2 h)</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              </>
            )}

            {/* Inferred OpenDrift Hindcast Particles (Pink, 2px, alpha 0.7) */}
            {activeLayers.hindcastParticles &&
              particles.map((pt, idx) => (
                <CircleMarker
                  key={idx}
                  center={[pt.lat, pt.lon]}
                  radius={2}
                  pathOptions={{
                    color: '#F472B6',
                    weight: 0,
                    fillColor: '#F472B6',
                    fillOpacity: 0.7,
                    interactive: false,
                  }}
                />
              ))}

            {/* Candidate Vessel Tracks (15:25Z–17:55Z window) */}
            {activeLayers.vesselTracks &&
              MALIBU_CASE.vessels.map((v) => {
                const isSelected = v.id === selectedVesselId;
                const opacity = isSelected ? 1.0 : 0.35;

                const segments: { type: 'observed' | 'derived'; points: [number, number][] }[] = [];
                let curSeg: { type: 'observed' | 'derived'; points: [number, number][] } | null = null;

                v.track.forEach((p) => {
                  if (!curSeg || curSeg.type !== p.provenance) {
                    if (curSeg) {
                      curSeg.points.push([p.lat, p.lon]);
                      segments.push(curSeg);
                    }
                    curSeg = { type: p.provenance, points: [[p.lat, p.lon]] };
                  } else {
                    curSeg.points.push([p.lat, p.lon]);
                  }
                });
                const lastSeg = curSeg as { type: 'observed' | 'derived'; points: [number, number][] } | null;
                if (lastSeg && lastSeg.points.length > 1) {
                  segments.push(lastSeg);
                }

                const curPos = positionAt(v.id, currentTimestampMs) || v.track[Math.floor(v.track.length / 2)];

                return (
                  <React.Fragment key={v.id}>
                    {isSelected && (
                      <Polyline
                        positions={v.track.map((p): [number, number] => [p.lat, p.lon])}
                        pathOptions={{
                          color: '#8E7BFF',
                          weight: 6,
                          opacity: 0.45,
                          interactive: false,
                        }}
                      />
                    )}

                    {segments.map((seg, sIdx) => {
                      if (seg.type === 'derived' && !activeLayers.aisGaps) return null;
                      return (
                        <Polyline
                          key={`${v.id}-${sIdx}`}
                          positions={seg.points}
                          pathOptions={{
                            color: seg.type === 'observed' ? '#2DD4BF' : '#FBBF24',
                            dashArray: seg.type === 'observed' ? undefined : '6, 6',
                            weight: isSelected ? 3 : 2,
                            opacity,
                          }}
                          eventHandlers={{
                            click: () => onSelectVessel && onSelectVessel(v.id),
                          }}
                        />
                      );
                    })}

                    {curPos && (
                      <Marker
                        position={[curPos.lat, curPos.lon]}
                        icon={createChevronIcon(curPos.cog, isSelected)}
                        eventHandlers={{
                          click: () => onSelectVessel && onSelectVessel(v.id),
                        }}
                      >
                        <Tooltip
                          direction="top"
                          offset={[0, -10]}
                          permanent={isSelected}
                          className="forensic-vessel-tooltip"
                        >
                          <div className="font-mono text-xs">
                            <span className="font-bold text-[var(--text-1)]">
                              #{v.rank} {v.name}
                            </span>
                            <div className="text-[var(--text-3)]">
                              DCPA: {v.dcpa.toFixed(1)} km · TCPA: {v.tcpa}m
                            </div>
                          </div>
                        </Tooltip>
                      </Marker>
                    )}
                  </React.Fragment>
                );
              })}

            {/* DCPA Line & Closest-Approach Marker for Selected Candidate */}
            {selectedVesselId && (() => {
              const cpa = closestApproach(selectedVesselId);
              const vessel = MALIBU_CASE.vessels.find((v) => v.id === selectedVesselId);
              if (!cpa) return null;
              return (
                <React.Fragment key="selected-cpa-elements">
                  {/* Amber dashed DCPA perpendicular connector */}
                  <Polyline
                    positions={[
                      [INFERRED_RELEASE_POINT.lat, INFERRED_RELEASE_POINT.lon],
                      [cpa.lat, cpa.lon],
                    ]}
                    pathOptions={{
                      color: '#FBBF24',
                      dashArray: '5, 5',
                      weight: 2,
                      opacity: 0.9,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]}>
                      <div className="font-mono text-xs">
                        <span className="text-[var(--derived)] font-bold">
                          DCPA: {cpa.distKm.toFixed(1)} km (DERIVED)
                        </span>
                        <div className="text-[var(--text-3)]">{vessel?.name} Closest Approach</div>
                      </div>
                    </Tooltip>
                  </Polyline>

                  {/* Closest Approach Position Marker */}
                  <CircleMarker
                    center={[cpa.lat, cpa.lon]}
                    radius={5}
                    pathOptions={{
                      color: '#FBBF24',
                      weight: 2,
                      fillColor: '#1A1829',
                      fillOpacity: 1,
                    }}
                  >
                    <Tooltip direction="bottom" offset={[0, 8]}>
                      <div className="font-mono text-xs">
                        <span className="text-[var(--derived)] font-bold">CPA: {cpa.distKm.toFixed(1)} km</span>
                        <div className="text-[var(--text-1)]">
                          {new Date(cpa.t).toISOString().substring(11, 16)} UTC ({vessel?.name})
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                </React.Fragment>
              );
            })()}
          </>
        )}
      </MapContainer>

      {/* Sector Badge: SANTA MONICA BAY */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-[var(--surface-1)]/90 border border-[var(--border-default)] px-3 py-1.5 rounded-[4px] shadow-lg text-[var(--text-2)] font-mono text-xs backdrop-blur-sm">
        <span className="w-2 h-2 rounded-full bg-[var(--violet-400)]" />
        <span className="font-semibold uppercase tracking-wider text-[var(--text-1)]">SANTA MONICA BAY</span>
        {pickOnMap && (
          <span className="text-[var(--warning)] ml-2 animate-pulse">● PICK ON MAP ACTIVE</span>
        )}
      </div>

      {/* Small non-blocking notice when tile-free mode is active */}
      {(basemapMode === 'off' || fallbackNoticeVisible) && (
        <div className="absolute top-12 left-3 z-30 flex items-center gap-2 bg-[var(--surface-1)]/90 border border-[var(--border-default)] px-3 py-1.5 rounded-[4px] shadow-lg text-[var(--text-2)] font-mono text-xs">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
          <span>Basemap unavailable, showing simplified coastline</span>
        </div>
      )}

      {/* Top-Right Controls: Basemap Toggle & Layer Menu Popover */}
      {showControls && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2 font-mono text-xs">
          {/* Layer Popover (only after run) */}
          {isRunDone && onToggleLayer && (
            <div className="relative">
              <button
                onClick={() => setLayerMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 bg-[var(--surface-1)]/90 hover:bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] px-2.5 py-1.5 rounded-[4px] shadow-md transition-colors cursor-pointer"
                title="Toggle evidence layers"
              >
                <Layers className="w-3.5 h-3.5 text-[var(--violet-400)]" />
                <span>Layers</span>
              </button>

              {layerMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[6px] shadow-2xl p-2.5 space-y-1.5 z-40 text-xs font-mono">
                  <div className="text-[var(--text-3)] uppercase tracking-wider pb-1 border-b border-[var(--border-subtle)] text-xs">
                    Evidence Layers
                  </div>
                  {[
                    { key: 'slickPolygon' as const, label: 'Observed Slick Polygon' },
                    { key: 'releaseEllipse' as const, label: '95% Confidence Ellipse' },
                    { key: 'hindcastParticles' as const, label: 'Hindcast Particles' },
                    { key: 'vesselTracks' as const, label: 'Candidate Vessel Tracks' },
                    { key: 'aisGaps' as const, label: 'Derived AIS Gaps' },
                  ].map((l) => (
                    <button
                      key={l.key}
                      onClick={() => onToggleLayer(l.key)}
                      className="w-full flex items-center justify-between px-2 py-1 rounded-[4px] hover:bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer text-left"
                    >
                      <span>{l.label}</span>
                      {activeLayers[l.key] ? (
                        <Check className="w-3.5 h-3.5 text-[var(--violet-400)]" />
                      ) : (
                        <span className="w-3.5 h-3.5 block" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Basemap Mode Toggle */}
          <button
            onClick={() => {
              setBasemapMode((m) => (m === 'esri' ? 'off' : 'esri'));
              setFallbackNoticeVisible(false);
            }}
            className="flex items-center gap-1.5 bg-[var(--surface-1)]/90 hover:bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--border-default)] px-2.5 py-1.5 rounded-[4px] shadow-md transition-colors cursor-pointer"
            title="Toggle between ESRI Dark Canvas basemap and offline simplified coastline"
          >
            {basemapMode === 'esri' ? (
              <>
                <Eye className="w-3.5 h-3.5 text-[var(--violet-400)]" />
                <span>ESRI Dark</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-[var(--text-3)]" />
                <span>Simplified</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Mandatory Attribution Footer Always Visible (text >= 12px) */}
      <div className="absolute bottom-1 right-2 z-20 pointer-events-none text-xs font-mono text-[var(--text-3)] bg-black/70 px-2 py-0.5 rounded-[4px]">
        Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors
      </div>
    </div>
  );
};
