import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCase } from '../../context/CaseContext';

export interface MapOverlaysState {
  slick: boolean;
  candidates: boolean;
  cpa: boolean;
  otherTraffic: boolean;
  driftOrigin: boolean;
}

export interface BaseMapProps {
  driftMode?: 'backward' | 'forward';
  baseLayer?: string;
  mapOverlays?: MapOverlaysState;
}

export const BaseMap: React.FC<BaseMapProps> = ({
  driftMode = 'backward',
  baseLayer = 'OpenStreetMap',
  mapOverlays = {
    slick: true,
    candidates: true,
    cpa: true,
    otherTraffic: true,
    driftOrigin: true,
  }
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseLayersRef = useRef<Record<string, L.TileLayer>>({});
  const overlayGroupsRef = useRef<{
    slick: L.LayerGroup;
    candidates: L.LayerGroup;
    cpa: L.LayerGroup;
    otherTraffic: L.LayerGroup;
    driftOrigin: L.LayerGroup;
  } | null>(null);
  const { caseData, selectedVesselId, setSelectedVesselId } = useCase();

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Map centered on observation centroid with smooth zoom
    const map = L.map(mapContainerRef.current, {
      center: [caseData.observationCentroid.lat, caseData.observationCentroid.lon],
      zoom: 11,
      zoomControl: true,
      attributionControl: true
    });

    // 1. Esri Ocean (Maritime)
    const esriOcean = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: 'Esri, GEBCO, NOAA'
      }
    );

    // 2. Satellite Imagery
    const satelliteImagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        attribution: 'Esri, Maxar'
      }
    );

    // 3. Dark Mode (Canvas)
    const darkMode = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: 'Esri, HERE'
      }
    );

    // 4. OpenStreetMap
    const openStreetMap = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }
    );

    // 5. Light Clean
    const lightClean = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: 'Esri'
      }
    );

    const baseTileLayers: Record<string, L.TileLayer> = {
      'Esri Ocean (Maritime)': esriOcean,
      'Satellite Imagery': satelliteImagery,
      'Dark Mode (Canvas)': darkMode,
      'OpenStreetMap': openStreetMap,
      'Light Clean': lightClean
    };
    baseLayersRef.current = baseTileLayers;

    // Attach active base layer
    const activeTileLayer = baseTileLayers[baseLayer] || openStreetMap;
    activeTileLayer.addTo(map);

    // Overlay Layer Groups:
    const slickOverlayGroup = L.layerGroup();
    const topCandidatesGroup = L.layerGroup();
    const cpaPointsGroup = L.layerGroup();
    const otherTrafficGroup = L.layerGroup();
    const driftOriginGroup = L.layerGroup();

    overlayGroupsRef.current = {
      slick: slickOverlayGroup,
      candidates: topCandidatesGroup,
      cpa: cpaPointsGroup,
      otherTraffic: otherTrafficGroup,
      driftOrigin: driftOriginGroup
    };

    if (mapOverlays.slick) slickOverlayGroup.addTo(map);
    if (mapOverlays.candidates) topCandidatesGroup.addTo(map);
    if (mapOverlays.cpa) cpaPointsGroup.addTo(map);
    if (mapOverlays.otherTraffic) otherTrafficGroup.addTo(map);
    if (mapOverlays.driftOrigin) driftOriginGroup.addTo(map);

    // 1. Observed Slick Polygon & Spread Envelope
    const slickPolygon = L.polygon(
      caseData.slick.vertices.map(v => [v.lat, v.lon] as [number, number]),
      {
        color: '#E03E3E', // Reddish envelope matching screenshot
        weight: 2.5,
        fillColor: '#EF4444',
        fillOpacity: 0.35
      }
    ).addTo(slickOverlayGroup);

    slickPolygon.bindPopup(`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #00435C; background: #D4F6F9; padding: 4px; border-radius: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,82,110,0.2); padding-bottom: 4px; margin-bottom: 6px;">
          <strong style="color: #00526E; font-size: 13px;">Observed Spill Envelope</strong>
          <span style="background: rgba(239,68,68,0.15); color: #B91C1C; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 10px;">SENTINEL-1</span>
        </div>
        <div style="line-height: 1.5;">
          <strong>Sensor:</strong> SAR C-Band Synthetic Aperture<br/>
          <strong>Detection Time:</strong> 01:50:00Z<br/>
          <strong>Footprint:</strong> ${caseData.slick.areaKm2} km² (${caseData.slick.lengthKm} km length)<br/>
          <strong>Centroid:</strong> ${caseData.observationCentroid.lat.toFixed(4)}°N, ${Math.abs(caseData.observationCentroid.lon).toFixed(4)}°W
        </div>
      </div>
    `);

    // Slick Centerline (dashed gold/amber line through observed slick)
    const sortedVertices = [...caseData.slick.vertices].sort((a, b) => a.lon - b.lon);
    if (sortedVertices.length >= 2) {
      const centerlinePoints: [number, number][] = [
        [sortedVertices[0].lat, sortedVertices[0].lon],
        [caseData.observationCentroid.lat, caseData.observationCentroid.lon],
        [sortedVertices[sortedVertices.length - 1].lat, sortedVertices[sortedVertices.length - 1].lon]
      ];
      L.polyline(centerlinePoints, {
        color: '#F59E0B',
        weight: 3,
        dashArray: '5,5',
        opacity: 0.95
      }).addTo(slickOverlayGroup);
    }

    // 2. Drift Origin Estimate (Backtrack) & Uncertainty Circles
    const releaseOrigin: [number, number] = [caseData.inferredReleasePoint.lat, caseData.inferredReleasePoint.lon];

    if (driftMode === 'backward') {
      // Concentric circles representing confidence bounds
      L.circle(releaseOrigin, {
        radius: caseData.errorEllipse95.semiMajorKm * 1000,
        color: '#E03E3E',
        weight: 1.5,
        fillColor: '#EF4444',
        fillOpacity: 0.12
      }).addTo(driftOriginGroup);

      L.circle(releaseOrigin, {
        radius: (caseData.errorEllipse95.semiMajorKm * 1000) * 0.5,
        color: '#F59E0B',
        weight: 1.5,
        dashArray: '4,4',
        fillColor: '#F59E0B',
        fillOpacity: 0.18
      }).addTo(driftOriginGroup);

      // Distinct drift origin pin/marker
      const releaseMarker = L.circleMarker(releaseOrigin, {
        radius: 7,
        color: '#FFFFFF',
        weight: 2,
        fillColor: '#F59E0B',
        fillOpacity: 1
      }).addTo(driftOriginGroup);

      releaseMarker.bindPopup(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #00435C; background: #D4F6F9; padding: 4px; border-radius: 4px;">
          <div style="border-bottom: 1px solid rgba(0,82,110,0.2); padding-bottom: 4px; margin-bottom: 6px;">
            <strong style="color: #00526E; font-size: 13px;">Drift Backtrack Origin (16:30:00Z)</strong>
          </div>
          <div style="line-height: 1.5;">
            <strong>Estimated Kinematic Origin:</strong> 16:30:00Z<br/>
            <strong>Coordinates:</strong> ${caseData.inferredReleasePoint.lat.toFixed(4)}°N, ${Math.abs(caseData.inferredReleasePoint.lon).toFixed(4)}°W<br/>
            <strong>Uncertainty Bound:</strong> &plusmn;${caseData.errorEllipse95.semiMajorKm} km (95% CI)<br/>
            <strong>Model:</strong> OpenDrift / OpenOil Reverse Advection
          </div>
        </div>
      `);

      // Lagrangian Backward Trajectory Curve
      const midLat = (caseData.observationCentroid.lat + releaseOrigin[0]) / 2 + 0.005;
      const midLon = (caseData.observationCentroid.lon + releaseOrigin[1]) / 2 - 0.005;
      L.polyline(
        [
          [caseData.observationCentroid.lat, caseData.observationCentroid.lon],
          [midLat, midLon],
          releaseOrigin
        ],
        {
          color: '#E03E3E',
          weight: 2.5,
          dashArray: '4,4',
          opacity: 0.95
        }
      ).addTo(driftOriginGroup);
    }

    // 3. Candidate Tracks & Maritime Traffic (Light grey lines, Selected appears red)
    caseData.vessels.forEach((vessel) => {
      if (!vessel.track || vessel.track.length === 0) return;

      const isRank1To3 = vessel.rank <= 3;
      const targetGroup = isRank1To3 ? topCandidatesGroup : otherTrafficGroup;
      const isSelected = vessel.id === selectedVesselId;

      const trackPoints = vessel.track.map(tp => [tp.lat, tp.lon] as [number, number]);

      // Unselected paths: light grey lines; Selected path: prominent red
      const polyline = L.polyline(trackPoints, {
        color: isSelected ? '#EF4444' : '#CBD5E1',
        weight: isSelected ? 4.5 : 2.5,
        dashArray: isSelected ? undefined : '5,4',
        opacity: isSelected ? 1 : 0.8,
      }).addTo(targetGroup);

      if (isSelected) {
        polyline.bringToFront();
      }

      // Closest Point of Approach (CPA) Points (added to cpaPointsGroup)
      const cpaPoint = trackPoints[Math.floor(trackPoints.length / 2)] || trackPoints[0];
      const cpaMarker = L.circleMarker(cpaPoint, {
        radius: isSelected ? 6.5 : 4,
        color: '#FFFFFF',
        weight: isSelected ? 2 : 1.5,
        fillColor: isSelected ? '#EF4444' : '#94A3B8',
        fillOpacity: isSelected ? 1 : 0.85
      }).addTo(cpaPointsGroup);

      if (isSelected) {
        cpaMarker.bringToFront();
      }

      const popupContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #00435C; background: #D4F6F9; min-width: 220px; padding: 4px; border-radius: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,82,110,0.25); padding-bottom: 4px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="background: ${isSelected ? '#EF4444' : '#64748B'}; color: #fff; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 10px; font-weight: 800;">#${vessel.rank}</span>
              <strong style="color: #00526E; font-size: 13px;">${vessel.name}</strong>
            </div>
            <span style="font-family: monospace; font-size: 10px; color: #005B7D;">MMSI: ${vessel.mmsi}</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: rgba(0,82,110,0.08); padding: 6px; border-radius: 4px; margin-bottom: 6px; font-size: 11px;">
            <div>
              <span style="color: #017A9F; font-size: 10px;">Fréchet Parity</span><br/>
              <strong style="color: #00435C;">${typeof vessel.frechet === 'number' ? vessel.frechet.toFixed(2) : '--'} km</strong>
            </div>
            <div>
              <span style="color: #017A9F; font-size: 10px;">DCPA</span><br/>
              <strong style="color: #00435C;">${vessel.dcpa.toFixed(2)} km</strong>
            </div>
            <div>
              <span style="color: #017A9F; font-size: 10px;">TCPA Offset</span><br/>
              <strong style="color: #00435C;">${vessel.tcpaSigned > 0 ? '+' : ''}${vessel.tcpaSigned ?? vessel.tcpa} min</strong>
            </div>
            <div>
              <span style="color: #017A9F; font-size: 10px;">AIS Integrity</span><br/>
              <strong style="color: #00435C;">${vessel.continuity}%</strong>
            </div>
          </div>

          <div style="font-size: 11px; line-height: 1.4; color: #005B7D;">
            <strong>Type:</strong> ${vessel.type} (${vessel.flag})<br/>
            <strong>Attribution Confidence:</strong> <span style="font-weight: 700; color: #00526E;">${vessel.confidence >= 0.7 ? 'HIGH' : vessel.confidence >= 0.4 ? 'MEDIUM' : 'LOW'} (${vessel.borda} pts)</span>
          </div>
        </div>
      `;

      polyline.bindPopup(popupContent);
      cpaMarker.bindPopup(popupContent);

      polyline.on('mouseover', () => {
        if (vessel.id !== selectedVesselId) {
          polyline.setStyle({ color: '#94A3B8', weight: 3.5, opacity: 0.95 });
        }
      });
      polyline.on('mouseout', () => {
        if (vessel.id !== selectedVesselId) {
          polyline.setStyle({ color: '#CBD5E1', weight: 2.5, opacity: 0.8 });
        }
      });

      polyline.on('click', () => {
        if (setSelectedVesselId) setSelectedVesselId(vessel.id);
      });
      cpaMarker.on('click', () => {
        if (setSelectedVesselId) setSelectedVesselId(vessel.id);
      });
    });

    // Auto-fit map viewport to active vessel tracks and spill polygon
    const allBoundsCoords: [number, number][] = [];
    caseData.vessels.forEach(v => {
      v.track.forEach(p => allBoundsCoords.push([p.lat, p.lon]));
    });
    caseData.slick.vertices.forEach(v => allBoundsCoords.push([v.lat, v.lon]));
    if (allBoundsCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allBoundsCoords).pad(0.08));
    }

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [caseData, driftMode, selectedVesselId, setSelectedVesselId]);

  // Dynamically update base tile layer when changed from left rail
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !baseLayersRef.current) return;

    Object.entries(baseLayersRef.current).forEach(([name, layer]) => {
      if (name === baseLayer) {
        if (!map.hasLayer(layer)) {
          layer.addTo(map);
        }
      } else {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      }
    });
  }, [baseLayer]);

  // Dynamically toggle overlay groups when changed from left rail
  useEffect(() => {
    const map = mapInstanceRef.current;
    const groups = overlayGroupsRef.current;
    if (!map || !groups || !mapOverlays) return;

    const groupMap: Record<keyof MapOverlaysState, L.LayerGroup> = {
      slick: groups.slick,
      candidates: groups.candidates,
      cpa: groups.cpa,
      otherTraffic: groups.otherTraffic,
      driftOrigin: groups.driftOrigin,
    };

    (Object.keys(groupMap) as (keyof MapOverlaysState)[]).forEach((key) => {
      const group = groupMap[key];
      const isVisible = mapOverlays[key];
      if (isVisible) {
        if (!map.hasLayer(group)) {
          map.addLayer(group);
        }
      } else {
        if (map.hasLayer(group)) {
          map.removeLayer(group);
        }
      }
    });
  }, [mapOverlays]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />;
};
