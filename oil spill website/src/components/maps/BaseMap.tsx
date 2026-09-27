import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCase } from '../../context/CaseContext';

export interface BaseMapProps {
  driftMode?: 'backward' | 'forward';
}

export const BaseMap: React.FC<BaseMapProps> = ({ driftMode = 'backward' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { caseData } = useCase();

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Center coordinates around Santa Monica Bay / Malibu case
    const map = L.map(mapContainerRef.current, {
      center: [caseData.observationCentroid.lat, caseData.observationCentroid.lon],
      zoom: 10,
      zoomControl: true,
      attributionControl: false
    });

    // Clean ESRI World Light Gray Canvas for high-contrast light mode
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        subdomains: ['server', 'services']
      }
    ).addTo(map);

    // Reference labels layer
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16
      }
    ).addTo(map);

    // 1. Observed Slick Footprint (Teal-green, solid border, semi-transparent fill)
    const slickPolygon = L.polygon(
      caseData.slick.vertices.map(v => [v.lat, v.lon] as [number, number]),
      {
        color: '#0F8A72',
        weight: 2,
        fillColor: '#0F8A72',
        fillOpacity: 0.35
      }
    ).addTo(map);
    slickPolygon.bindPopup(`
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #14171C;">
        <strong style="color: #0F8A72;">Observed Slick Footprint</strong><br/>
        Sensor: Sentinel-1 SAR C-Band<br/>
        Acquired: 01:50:00Z<br/>
        Area: ${caseData.slick.areaKm2} km² (${caseData.slick.lengthKm} km length)
      </div>
    `);

    const releaseOrigin: [number, number] = [caseData.inferredReleasePoint.lat, caseData.inferredReleasePoint.lon];

    if (driftMode === 'backward') {
      // 2. Inferred Release Point & 95% Confidence Ellipse
      L.circle(releaseOrigin, {
        radius: caseData.errorEllipse95.semiMajorKm * 1000,
        color: '#B23A6B',
        weight: 1.5,
        dashArray: '4,4',
        fillColor: '#B23A6B',
        fillOpacity: 0.15
      }).addTo(map);

      const releaseMarker = L.circleMarker(releaseOrigin, {
        radius: 5,
        color: '#B23A6B',
        fillColor: '#B23A6B',
        fillOpacity: 1
      }).addTo(map);
      releaseMarker.bindPopup(`
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #14171C;">
          <strong style="color: #B23A6B;">Reconstructed Release Origin (Backward Drift)</strong><br/>
          Epoch: 16:40:00Z (T - 9.2h)<br/>
          Coordinates: ${caseData.inferredReleasePoint.lat.toFixed(4)}°N, ${Math.abs(caseData.inferredReleasePoint.lon).toFixed(4)}°W<br/>
          95% Confidence Semi-Major: ${caseData.errorEllipse95.semiMajorKm} km
        </div>
      `);

      // 3. Lagrangian Backward Trajectory Curve
      L.polyline(
        [
          [caseData.observationCentroid.lat, caseData.observationCentroid.lon],
          [34.012, -118.695],
          releaseOrigin
        ],
        {
          color: '#B23A6B',
          weight: 2,
          dashArray: '3,4',
          opacity: 0.85
        }
      ).addTo(map);
    } else {
      // Forward Drift Trajectory
      const forwardTarget: [number, number] = [33.935, -118.520];

      // Projected Forward Impact / Dispersion Ellipse
      L.circle(forwardTarget, {
        radius: 4500,
        color: '#0284C7',
        weight: 1.5,
        dashArray: '4,4',
        fillColor: '#0284C7',
        fillOpacity: 0.18
      }).addTo(map);

      const forwardMarker = L.circleMarker(forwardTarget, {
        radius: 5,
        color: '#0284C7',
        fillColor: '#0284C7',
        fillOpacity: 1
      }).addTo(map);
      forwardMarker.bindPopup(`
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #14171C;">
          <strong style="color: #0284C7;">Forecast Spread Centroid (Forward Drift)</strong><br/>
          Horizon: T + 12.0h (OpenDrift Eulerian-Lagrangian forward)<br/>
          Coordinates: ${forwardTarget[0].toFixed(4)}°N, ${Math.abs(forwardTarget[1]).toFixed(4)}°W<br/>
          Coastal Proximity: 4.8 km to Santa Monica monitoring line
        </div>
      `);

      // Forward Trajectory Path
      L.polyline(
        [
          [caseData.observationCentroid.lat, caseData.observationCentroid.lon],
          [33.985, -118.595],
          forwardTarget
        ],
        {
          color: '#0284C7',
          weight: 2.5,
          dashArray: '4,4',
          opacity: 0.9
        }
      ).addTo(map);
    }

    // 4. Candidate Vessel 1 Track (Amber dashed with transponder gap)
    const topVessel = caseData.vessels[0];
    if (topVessel.track && topVessel.track.length > 0) {
      const trackPoints = topVessel.track.map(tp => [tp.lat, tp.lon] as [number, number]);
      const vesselTrack = L.polyline(trackPoints, {
        color: '#B7791F',
        weight: 2.5,
        dashArray: '4,4'
      }).addTo(map);
      vesselTrack.bindPopup(`
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #14171C;">
          <strong style="color: #B7791F;">Candidate Track: ${topVessel.name}</strong><br/>
          MMSI: ${topVessel.mmsi}<br/>
          DCPA: ${topVessel.dcpa} km | TCPA: ${topVessel.tcpa} min<br/>
          Continuity: ${topVessel.continuity}%
        </div>
      `);
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [caseData, driftMode]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />;
};
