/**
 * Scene3D: Production-grade 3D Ocean Surface & Lagrangian Kinematic Reconstruction
 * Built with React-Three-Fiber & Drei.
 * 1 Unit = 1 km in local Cartesian frame from toKm(); Y is UP.
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import { useCase } from '../../context/CaseContext';
import {
  COASTLINE,
  COASTLINE_LAND_POLYGON,
  SLICK_VERTICES,
  INFERRED_RELEASE_POINT,
  particlesAt,
  positionAt,
  closestApproach,
  toKm,
  TrackPoint,
} from '../../data/malibuCase';
import { WorkspaceLayers } from './WorkspaceLeftRail';
import { T_RELEASE_MS, T_SAR_MS } from './WorkspaceTimeline';

interface Scene3DProps {
  cameraMode: string;
  currentSimMs: number;
  layers: WorkspaceLayers;
  vesselVisibility: Record<string, boolean>;
}

// ----------------------------------------------------------------------------
// CAMERA CONTROLLER: Handles presets & smooth 800ms ease-out transitions
// ----------------------------------------------------------------------------
function CameraController({
  cameraMode,
  selectedVesselId,
  currentSimMs,
}: {
  cameraMode: string;
  selectedVesselId: string;
  currentSimMs: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  // Desired camera target and position
  const targetCamPos = useRef(new THREE.Vector3(7.0, 14.0, 14.5));
  const targetLookAt = useRef(new THREE.Vector3(-3.0, 0, 0.5));
  const isInitialFramed = useRef(false);

  // Compute Initial Framing bounding box on mount
  useEffect(() => {
    if (!isInitialFramed.current) {
      // Release point
      const relKm = toKm(INFERRED_RELEASE_POINT.lat, INFERRED_RELEASE_POINT.lon);
      // Selected vessel CPA
      const cpa = closestApproach(selectedVesselId);
      const cpaKm = toKm(cpa.lat, cpa.lon);

      // Bounding box of slick + release + CPA
      let minX = relKm.x;
      let maxX = relKm.x;
      let minZ = -relKm.y;
      let maxZ = -relKm.y;

      [...SLICK_VERTICES.map((v) => toKm(v.lat, v.lon)), cpaKm].forEach((pt) => {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minZ = Math.min(minZ, -pt.y);
        maxZ = Math.max(maxZ, -pt.y);
      });

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const span = Math.max(maxX - minX, maxZ - minZ, 12);

      // Tactical Iso perspective framing
      targetLookAt.current.set(centerX, 0, centerZ);
      targetCamPos.current.set(
        centerX + span * 0.75,
        span * 0.95,
        centerZ + span * 0.85
      );

      camera.position.copy(targetCamPos.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.update();
      }
      isInitialFramed.current = true;
    }
  }, [camera, selectedVesselId]);

  // Handle Preset changes
  useEffect(() => {
    if (cameraMode === 'tactical') {
      // Azimuth 35°, Elevation 40°
      targetLookAt.current.set(-3.0, 0, 0.5);
      targetCamPos.current.set(6.8, 14.2, 14.4);
    } else if (cameraMode === 'nadir') {
      // Top-down Ortho view
      targetLookAt.current.set(-3.0, 0, 0.5);
      targetCamPos.current.set(-3.0, 32.0, 0.501);
    } else if (cameraMode === 'release') {
      // Orbit 6 km around release marker
      const relKm = toKm(INFERRED_RELEASE_POINT.lat, INFERRED_RELEASE_POINT.lon);
      targetLookAt.current.set(relKm.x, 0.3, -relKm.y);
      targetCamPos.current.set(relKm.x + 4.2, 3.8, -relKm.y + 4.2);
    } else if (cameraMode === 'follow') {
      const pos = positionAt(selectedVesselId, currentSimMs);
      if (pos) {
        const km = toKm(pos.lat, pos.lon);
        targetLookAt.current.set(km.x, 0.2, -km.y);
        targetCamPos.current.set(km.x - 3.2, 3.2, -km.y + 3.2);
      } else {
        const cpa = closestApproach(selectedVesselId);
        const km = toKm(cpa.lat, cpa.lon);
        targetLookAt.current.set(km.x, 0.2, -km.y);
        targetCamPos.current.set(km.x - 3.2, 3.2, -km.y + 3.2);
      }
    }
  }, [cameraMode, selectedVesselId, currentSimMs]);

  // Smooth lerp transition per frame (simulating ~800ms ease-out)
  useFrame((_, delta) => {
    const lerpFactor = Math.min(1, delta * 3.8);
    camera.position.lerp(targetCamPos.current, lerpFactor);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, lerpFactor);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={2}
      maxDistance={120}
      maxPolarAngle={Math.PI / 2 - 0.02} // Prevent camera going below water
    />
  );
}

// ----------------------------------------------------------------------------
// SEA SURFACE: 120×90 km Plane with Radial Gradient Texture & Exponential Fog
// ----------------------------------------------------------------------------
function SeaPlane() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
    grad.addColorStop(0, '#0d0b1a');
    grad.addColorStop(0.65, '#070612');
    grad.addColorStop(1, '#05040f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[120, 90]} />
      <meshBasicMaterial map={texture} depthWrite={false} />
    </mesh>
  );
}

// ----------------------------------------------------------------------------
// METRIC GRID: Minor lines every 1 km (5% white), Major every 5 km (12% white)
// ----------------------------------------------------------------------------
function MetricGrid({ opacity, visible }: { opacity: number; visible: boolean }) {
  const { minorLines, majorLines, edgeLabels } = useMemo(() => {
    const minorPts: number[] = [];
    const majorPts: number[] = [];
    const labels: { text: string; x: number; z: number }[] = [];

    // X lines (-60 to +60 km)
    for (let x = -60; x <= 60; x += 1) {
      if (x % 5 === 0) {
        majorPts.push(x, 0.008, -45, x, 0.008, 45);
        if (x >= -40 && x <= 40 && x % 10 === 0) {
          labels.push({ text: `${x > 0 ? '+' : ''}${x} km`, x, z: 38 });
        }
      } else {
        minorPts.push(x, 0.004, -45, x, 0.004, 45);
      }
    }

    // Z lines (-45 to +45 km)
    for (let z = -45; z <= 45; z += 1) {
      if (z % 5 === 0) {
        majorPts.push(-60, 0.008, z, 60, 0.008, z);
        if (z >= -30 && z <= 30 && z % 10 === 0) {
          labels.push({ text: `${-z > 0 ? '+' : ''}${-z} km`, x: -48, z });
        }
      } else {
        minorPts.push(-60, 0.004, z, 60, 0.004, z);
      }
    }

    const minorGeo = new THREE.BufferGeometry();
    minorGeo.setAttribute('position', new THREE.Float32BufferAttribute(minorPts, 3));

    const majorGeo = new THREE.BufferGeometry();
    majorGeo.setAttribute('position', new THREE.Float32BufferAttribute(majorPts, 3));

    return { minorLines: minorGeo, majorLines: majorGeo, edgeLabels: labels };
  }, []);

  useEffect(() => {
    return () => {
      minorLines.dispose();
      majorLines.dispose();
    };
  }, [minorLines, majorLines]);

  if (!visible) return null;

  return (
    <group>
      {/* Minor 1 km Grid */}
      <lineSegments geometry={minorLines}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.05 * opacity} depthWrite={false} />
      </lineSegments>

      {/* Major 5 km Grid */}
      <lineSegments geometry={majorLines}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.12 * opacity} depthWrite={false} />
      </lineSegments>

      {/* Grid Edge Coordinate Labels */}
      {edgeLabels.map((lbl, idx) => (
        <Html key={`grid-label-${idx}`} position={[lbl.x, 0.02, lbl.z]} center>
          <span className="font-mono text-xs text-[var(--text-3)] select-none pointer-events-none opacity-60">
            {lbl.text}
          </span>
        </Html>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// LAND: Coastline Extruded ~0.15 km in surface-2 with 1px Edge Line
// ----------------------------------------------------------------------------
function LandMass({ opacity, visible }: { opacity: number; visible: boolean }) {
  const { landGeo, coastLinePts } = useMemo(() => {
    const shape = new THREE.Shape();
    COASTLINE_LAND_POLYGON.forEach(([lat, lon], idx) => {
      const km = toKm(lat, lon);
      if (idx === 0) shape.moveTo(km.x, km.y);
      else shape.lineTo(km.x, km.y);
    });
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.15,
      bevelEnabled: false,
    });

    const coastPts: [number, number, number][] = COASTLINE.map(([lat, lon]) => {
      const km = toKm(lat, lon);
      return [km.x, 0.155, -km.y];
    });

    return { landGeo: geo, coastLinePts: coastPts };
  }, []);

  useEffect(() => {
    return () => landGeo.dispose();
  }, [landGeo]);

  if (!visible) return null;

  return (
    <group>
      {/* Extruded Land Mesh */}
      <mesh
        geometry={landGeo}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color="#13111C"
          roughness={0.7}
          metalness={0.2}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* 1px Coastline Edge Line */}
      <Line
        points={coastLinePts}
        color="#7C3AED"
        lineWidth={1.5}
        opacity={opacity}
        transparent
      />
    </group>
  );
}

// ----------------------------------------------------------------------------
// OBSERVED SLICK: ShapeGeometry at y=0.02, Teal 18% Alpha + Solid Teal Outline
// ----------------------------------------------------------------------------
function SlickMesh({ opacity, visible }: { opacity: number; visible: boolean }) {
  const { slickGeo, outlinePts } = useMemo(() => {
    const shape = new THREE.Shape();
    SLICK_VERTICES.forEach((v, idx) => {
      const km = toKm(v.lat, v.lon);
      if (idx === 0) shape.moveTo(km.x, km.y);
      else shape.lineTo(km.x, km.y);
    });
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);

    const pts: [number, number, number][] = SLICK_VERTICES.map((v) => {
      const km = toKm(v.lat, v.lon);
      return [km.x, 0.025, -km.y];
    });
    pts.push(pts[0]); // Close loop

    return { slickGeo: geo, outlinePts: pts };
  }, []);

  useEffect(() => {
    return () => slickGeo.dispose();
  }, [slickGeo]);

  if (!visible) return null;

  return (
    <group>
      {/* Translucent Teal Fill */}
      <mesh
        geometry={slickGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      >
        <meshBasicMaterial
          color="#2DD4BF"
          transparent
          opacity={0.18 * opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Solid Teal Outline */}
      <Line
        points={outlinePts}
        color="#2DD4BF"
        lineWidth={2}
        opacity={opacity}
        transparent
      />
    </group>
  );
}

// ----------------------------------------------------------------------------
// HINDCAST PARTICLES: THREE.Points, 1,500 points, Additive Pink, Size ≈3px
// ----------------------------------------------------------------------------
function HindcastParticles({
  tau,
  opacity,
  visible,
}: {
  tau: number;
  opacity: number;
  visible: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const posArray = useMemo(() => new Float32Array(1500 * 3), []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    return g;
  }, [posArray]);

  // Update particle positions per frame/tau from particlesAt(tau)
  useEffect(() => {
    if (!visible) return;
    const pts = particlesAt(tau);
    const attr = geo.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < 1500; i++) {
      const km = toKm(pts[i].lat, pts[i].lon);
      attr.setXYZ(i, km.x, 0.04, -km.y);
    }
    attr.needsUpdate = true;
  }, [tau, visible, geo]);

  useEffect(() => {
    return () => geo.dispose();
  }, [geo]);

  if (!visible) return null;

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial
        color="#F472B6"
        size={0.15}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
        transparent
        opacity={0.88 * opacity}
        depthWrite={false}
      />
    </points>
  );
}

// ----------------------------------------------------------------------------
// 95% ERROR ELLIPSE: Pink Dotted Ring at Release Point
// ----------------------------------------------------------------------------
function ErrorEllipse({ opacity, visible }: { opacity: number; visible: boolean }) {
  const ellipsePts = useMemo(() => {
    const relKm = toKm(INFERRED_RELEASE_POINT.lat, INFERRED_RELEASE_POINT.lon);
    const cx = relKm.x;
    const cz = -relKm.y;
    const a = 3.1; // km semi-major
    const b = 1.9; // km semi-minor
    const angleRad = (-10 * Math.PI) / 180; // 80° bearing (10° north of east)

    const pts: [number, number, number][] = [];
    const N = 64;
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * 2 * Math.PI;
      const u = a * Math.cos(th);
      const v = b * Math.sin(th);
      const dx = u * Math.cos(angleRad) - v * Math.sin(angleRad);
      const dz = -(u * Math.sin(angleRad) + v * Math.cos(angleRad));
      pts.push([cx + dx, 0.03, cz + dz]);
    }
    return pts;
  }, []);

  if (!visible) return null;

  return (
    <Line
      points={ellipsePts}
      color="#F472B6"
      dashed
      dashScale={3}
      dashSize={0.4}
      gapSize={0.25}
      lineWidth={1.5}
      opacity={opacity}
      transparent
    />
  );
}

// ----------------------------------------------------------------------------
// FORENSIC MARKERS: Short Release Pole (~0.6 km) & SAR Observation Marker
// ----------------------------------------------------------------------------
function ForensicMarkers() {
  const relKm = useMemo(
    () => toKm(INFERRED_RELEASE_POINT.lat, INFERRED_RELEASE_POINT.lon),
    []
  );

  return (
    <group>
      {/* 1. Inferred Release Point Marker */}
      <group position={[relKm.x, 0, -relKm.y]}>
        {/* Ring on water */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.35, 0.45, 32]} />
          <meshBasicMaterial color="#F472B6" transparent opacity={0.8} />
        </mesh>

        {/* Short thin pink pole (0.6 km tall) */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.6, 16]} />
          <meshBasicMaterial color="#F472B6" transparent opacity={0.9} />
        </mesh>

        {/* Top luminous beacon sphere */}
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#F472B6" />
        </mesh>

        {/* Billboard Tag */}
        <Html position={[0, 0.75, 0]} center>
          <div className="bg-[var(--surface-1)]/95 border border-[var(--pink-400)] text-[var(--pink-400)] px-2.5 py-1 rounded-[4px] shadow-xl text-xs font-mono whitespace-nowrap font-bold pointer-events-none">
            INFERRED RELEASE · 16:40Z
          </div>
        </Html>
      </group>

      {/* 2. SAR Observation Centroid Marker */}
      <group position={[0, 0, 0]}>
        {/* Ring on water */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshBasicMaterial color="#2DD4BF" transparent opacity={0.8} />
        </mesh>

        {/* Short thin teal pin */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.5, 16]} />
          <meshBasicMaterial color="#2DD4BF" transparent opacity={0.9} />
        </mesh>

        {/* Top beacon sphere */}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#2DD4BF" />
        </mesh>

        {/* Billboard Tag */}
        <Html position={[0, 0.65, 0]} center>
          <div className="bg-[var(--surface-1)]/95 border border-[var(--teal-400)] text-[var(--teal-400)] px-2.5 py-1 rounded-[4px] shadow-xl text-xs font-mono whitespace-nowrap font-bold pointer-events-none">
            SAR OBSERVATION · 01:50Z
          </div>
        </Html>
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// VESSEL CHEVRON MESH (~0.25 km)
// ----------------------------------------------------------------------------
function ChevronMesh({ isSelected }: { isSelected: boolean }) {
  const geo = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    // Chevron pointing along -Z
    const vertices = new Float32Array([
      0, 0, -0.22, // 0: tip
      0.11, 0, 0.12, // 1: right wing
      0, 0, 0.04, // 2: inner notch
      0, 0, -0.22, // 0: tip
      0, 0, 0.04, // 2: inner notch
      -0.11, 0, 0.12, // 3: left wing
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.computeVertexNormals();
    return geom;
  }, []);

  return (
    <mesh geometry={geo}>
      <meshBasicMaterial
        color={isSelected ? '#8E7BFF' : '#9E9EB8'}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ----------------------------------------------------------------------------
// CANDIDATE VESSEL TRACKS, LIVE CHEVRONS & DCPA LINES
// ----------------------------------------------------------------------------
function CandidateVessels({
  currentSimMs,
  layers,
  vesselVisibility,
}: {
  currentSimMs: number;
  layers: WorkspaceLayers;
  vesselVisibility: Record<string, boolean>;
}) {
  const { caseData, selectedVesselId, setSelectedVesselId } = useCase();
  const [hoveredVesselId, setHoveredVesselId] = useState<string | null>(null);

  // Release point coords for DCPA line
  const relKm = useMemo(
    () => toKm(INFERRED_RELEASE_POINT.lat, INFERRED_RELEASE_POINT.lon),
    []
  );

  return (
    <group>
      {caseData.vessels.map((vessel) => {
        if (vesselVisibility[vessel.id] === false) return null;

        const isSelected = vessel.id === selectedVesselId;
        const isHovered = vessel.id === hoveredVesselId;

        // Partition track into contiguous segments of observed vs derived
        const segments: { pts: [number, number, number][]; provenance: 'observed' | 'derived' }[] = [];
        let currentSeg: [number, number, number][] = [];
        let currentProv: 'observed' | 'derived' = vessel.track[0].provenance;

        vessel.track.forEach((pt) => {
          const km = toKm(pt.lat, pt.lon);
          const pos3d: [number, number, number] = [km.x, 0.05, -km.y];

          if (pt.provenance !== currentProv && currentSeg.length > 0) {
            currentSeg.push(pos3d);
            segments.push({ pts: currentSeg, provenance: currentProv });
            currentSeg = [pos3d];
            currentProv = pt.provenance;
          } else {
            currentSeg.push(pos3d);
          }
        });
        if (currentSeg.length > 0) {
          segments.push({ pts: currentSeg, provenance: currentProv });
        }

        // Live Vessel Position at current simulation time
        const livePos: TrackPoint | null = positionAt(vessel.id, currentSimMs);

        // Vessel Closest Approach (CPA) info
        const cpa = closestApproach(vessel.id);
        const cpaKm = toKm(cpa.lat, cpa.lon);

        return (
          <group key={vessel.id}>
            {/* Track Segments */}
            {segments.map((seg, sIdx) => {
              const isObs = seg.provenance === 'observed';
              const isLayerVis = isObs
                ? layers.observedTracks.visible
                : layers.derivedSegments.visible;
              const layerOpacity = isObs
                ? layers.observedTracks.opacity
                : layers.derivedSegments.opacity;

              if (!isLayerVis) return null;

              return (
                <Line
                  key={`${vessel.id}-seg-${sIdx}`}
                  points={seg.pts}
                  color={isObs ? '#2DD4BF' : '#F59E0B'}
                  dashed={!isObs}
                  dashScale={3}
                  dashSize={0.4}
                  gapSize={0.25}
                  lineWidth={isSelected ? 2.5 : 1.5}
                  opacity={layerOpacity * (isSelected ? 1.0 : 0.35)}
                  transparent
                />
              );
            })}

            {/* Live Vessel Chevron Marker (visible only during 15:25Z–17:55Z window) */}
            {livePos && (
              <group
                position={[
                  toKm(livePos.lat, livePos.lon).x,
                  0.08,
                  -toKm(livePos.lat, livePos.lon).y,
                ]}
                rotation={[0, (-livePos.cog * Math.PI) / 180, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVesselId(vessel.id);
                }}
                onPointerOver={() => setHoveredVesselId(vessel.id)}
                onPointerOut={() => setHoveredVesselId(null)}
              >
                <ChevronMesh isSelected={isSelected} />

                {/* Billboard label for selected or hovered candidate */}
                {(isSelected || isHovered) && (
                  <Html position={[0, 0.35, 0]} center>
                    <div
                      className={`px-2 py-0.5 rounded-[4px] text-xs font-mono whitespace-nowrap shadow-xl border cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--surface-1)] border-[var(--violet-500)] text-white font-bold'
                          : 'bg-[var(--surface-1)]/90 border-[var(--border-default)] text-[var(--text-1)]'
                      }`}
                    >
                      #{vessel.rank} {vessel.name} · {livePos.sog.toFixed(1)} kts
                    </div>
                  </Html>
                )}
              </group>
            )}

            {/* DCPA Dashed Line: strictly for the selected vessel */}
            {isSelected && (
              <group>
                <Line
                  points={[
                    [cpaKm.x, 0.06, -cpaKm.y],
                    [relKm.x, 0.06, -relKm.y],
                  ]}
                  color="#8E7BFF"
                  dashed
                  dashScale={3}
                  dashSize={0.3}
                  gapSize={0.2}
                  lineWidth={2}
                />

                {/* DCPA Label Midway */}
                <Html
                  position={[
                    (cpaKm.x + relKm.x) / 2,
                    0.25,
                    (-cpaKm.y - relKm.y) / 2,
                  ]}
                  center
                >
                  <div className="bg-[var(--surface-1)]/95 border border-[var(--violet-400)] text-[var(--violet-300)] px-2 py-0.5 rounded-[4px] shadow-lg text-xs font-mono whitespace-nowrap font-bold pointer-events-none">
                    DCPA {vessel.dcpa.toFixed(1)} km
                  </div>
                </Html>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ----------------------------------------------------------------------------
// MAIN SCENE3D COMPONENT
// ----------------------------------------------------------------------------
export const Scene3D: React.FC<Scene3DProps> = ({
  cameraMode,
  currentSimMs,
  layers,
  vesselVisibility,
}) => {
  const { selectedVesselId } = useCase();

  // Compute tau (0.0 at 16:40Z release, 1.0 at 01:50Z SAR pass)
  const tau = useMemo(() => {
    if (currentSimMs <= T_RELEASE_MS) return 0;
    if (currentSimMs >= T_SAR_MS) return 1;
    return (currentSimMs - T_RELEASE_MS) / (T_SAR_MS - T_RELEASE_MS);
  }, [currentSimMs]);

  return (
    <div className="relative w-full h-full bg-[#05040F] overflow-hidden select-none">
      <Canvas
        camera={{ position: [7.0, 14.0, 14.5], fov: 45, near: 0.1, far: 500 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
      >
        {/* Dark void background and subtle exponential fog */}
        <color attach="background" args={['#05040F']} />
        <fogExp2 attach="fog" args={['#05040F', 0.012]} />

        {/* Low ambient + soft directional light */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[15, 30, 20]} intensity={1.2} color="#b7adff" />

        {/* OrbitControls with 800ms ease-out transitions */}
        <CameraController
          cameraMode={cameraMode}
          selectedVesselId={selectedVesselId}
          currentSimMs={currentSimMs}
        />

        {/* 1. Sea Plane */}
        <SeaPlane />

        {/* 2. Metric Grid (1 km minor, 5 km major, edge labels) */}
        <MetricGrid opacity={layers.grid.opacity} visible={layers.grid.visible} />

        {/* 3. Extruded Land & Coastline */}
        <LandMass opacity={layers.coastline.opacity} visible={layers.coastline.visible} />

        {/* 4. Observed Slick */}
        <SlickMesh opacity={layers.slick.opacity} visible={layers.slick.visible} />

        {/* 5. Hindcast Particles (1,500 points, additive blending) */}
        <HindcastParticles
          tau={tau}
          opacity={layers.particles.opacity}
          visible={layers.particles.visible}
        />

        {/* 6. 95% Confidence Error Ellipse */}
        <ErrorEllipse opacity={layers.ellipse.opacity} visible={layers.ellipse.visible} />

        {/* 7. Forensic Release & SAR Observation Markers */}
        <ForensicMarkers />

        {/* 8. Candidate Vessel Trajectories, Live Chevrons & DCPA */}
        <CandidateVessels
          currentSimMs={currentSimMs}
          layers={layers}
          vesselVisibility={vesselVisibility}
        />
      </Canvas>
    </div>
  );
};
