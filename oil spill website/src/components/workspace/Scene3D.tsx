import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useCase } from '../../context/CaseContext';
import { createTankerShip } from './TankerShip';
import { ZoomIn, ZoomOut, Navigation } from 'lucide-react';

interface Scene3DProps {
  layers: {
    slick: boolean;
    trajectories: boolean;
    vessels: boolean;
    bathymetry: boolean;
    currents: boolean;
    terrain?: boolean;
  };
  cameraView: 'perspective' | 'top' | 'oblique';
}

/**
 * Coastal promontory / shoreline Z function for Santa Monica Bay & Point Dume
 */
export function getCoastlineZ(wx: number): number {
  const dumePromontory = Math.exp(-Math.pow((wx + 22) / 11, 2)) * 8.5; // Point Dume headland
  const malibuPoint = Math.exp(-Math.pow((wx - 14) / 9, 2)) * 4.8;
  const bayBight = Math.sin(wx * 0.038) * 4.5;
  return -27 + dumePromontory + malibuPoint + bayBight;
}

/**
 * Procedural coastal mountain terrain height (Santa Monica Mountains & coastal bluffs)
 */
export function getCoastalTerrainElevation(wx: number, wz: number): number {
  const coastZ = getCoastlineZ(wx);
  const inlandDist = coastZ - wz;
  if (inlandDist <= 0) return 0; // Submerged / seaward of shoreline

  const normDist = Math.min(inlandDist / 85, 1.0);
  const baseRise = Math.pow(normDist, 0.72) * 19.5;

  // Mountain ridgelines and coastal canyons (Topanga, Malibu, Zuma canyons)
  const r1 = Math.abs(Math.sin(wx * 0.055 + wz * 0.035)) * 6.5;
  const r2 = Math.cos(wx * 0.12 - wz * 0.08) * 3.2;
  const r3 = Math.sin(wx * 0.22 + wz * 0.15) * 1.5;
  const canyonMod = 1.0 - 0.45 * Math.pow(Math.sin(wx * 0.065 + 0.8), 6);

  const rawElevation = (baseRise + (r1 + r2 + r3) * (0.3 + normDist * 0.7)) * canyonMod;
  const beachRamp = Math.min(1.0, Math.pow(inlandDist / 3.8, 1.4));
  return Math.max(0, rawElevation * beachRamp);
}

/**
 * Procedural bathymetric seabed depth (Continental shelf & Point Dume submarine canyon)
 */
export function getSeabedDepth(wx: number, wz: number): number {
  const coastZ = getCoastlineZ(wx);
  const seawardDist = wz - coastZ;
  if (seawardDist <= 0) return 0; // Coastal land

  // Continental shelf gentle slope dropping over continental shelf break
  const shelfBreak = 35; // units offshore
  let depth = 0;
  if (seawardDist < shelfBreak) {
    depth = -1.0 - (seawardDist / shelfBreak) * 3.5;
  } else {
    const slopeDist = seawardDist - shelfBreak;
    depth = -4.5 - Math.pow(Math.min(slopeDist / 55, 1.0), 0.85) * 14.0;
  }

  // Point Dume Submarine Canyon cutting through shelf
  const canyonDistToAxis = Math.abs((wx + 20) - (wz * 0.45));
  if (canyonDistToAxis < 16) {
    const canyonDepth = (1.0 - canyonDistToAxis / 16) * 7.5;
    depth -= canyonDepth;
  }

  return depth;
}

export function createOilSlickTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256);

  // Heavy, pitch-dark black crude oil slick gradient
  const grad = ctx.createRadialGradient(0, 0, 15, 0, 0, 220);
  grad.addColorStop(0, 'rgba(3, 3, 5, 0.99)'); // Deepest pitch-black crude petroleum core
  grad.addColorStop(0.35, 'rgba(8, 8, 12, 0.97)'); // Dense black crude oil
  grad.addColorStop(0.65, 'rgba(16, 17, 22, 0.92)'); // Heavy dark petroleum sheen
  grad.addColorStop(0.85, 'rgba(28, 30, 38, 0.65)'); // Dark hydrocarbon boundary
  grad.addColorStop(0.96, 'rgba(38, 42, 50, 0.25)'); // Transition to water
  grad.addColorStop(1, 'rgba(20, 24, 30, 0)'); // Fade out

  ctx.fillStyle = grad;
  ctx.beginPath();
  const numPoints = 36;
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const rBase = 185;
    const rVar = Math.sin(angle * 3) * 22 + Math.cos(angle * 5) * 14 + Math.sin(angle * 2) * 30;
    const rx = (rBase + rVar) * 1.15;
    const ry = (rBase + rVar) * 0.72;
    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Dense inner heavy black bitumen / crude emulsion streak
  const innerGrad = ctx.createRadialGradient(-15, -5, 5, 0, 0, 110);
  innerGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)'); // 100% pitch jet black
  innerGrad.addColorStop(0.7, 'rgba(5, 5, 8, 0.98)');
  innerGrad.addColorStop(1, 'rgba(10, 10, 15, 0)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.ellipse(-15, -5, 105, 50, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export const Scene3D: React.FC<Scene3DProps> = ({ layers, cameraView }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { caseData, timeCursor } = useCase();
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Keep a reference to timeCursor for 60fps animation without triggering full scene rebuilds
  const timeCursorRef = useRef<number>(timeCursor);
  useEffect(() => {
    timeCursorRef.current = timeCursor;
  }, [timeCursor]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 600;

    // ----------------------------------------------------
    // Scene & Dark Maritime Atmosphere (No fog for clear visibility at distance)
    // ----------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x041624);

    // ----------------------------------------------------
    // Camera & Controls (Zoomed out further at a wide tactical distance)
    // ----------------------------------------------------
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(58, 48, 72);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // prevent going below ocean plane
    controls.minDistance = 6;   // Zoom in cap (prevents clipping through ship)
    controls.maxDistance = 160; // Zoom out cap (prevents zooming out too far into void)
    controls.target.set(0, 0.6, 0); // Focus on central arena

    // ----------------------------------------------------
    // Lighting
    // ----------------------------------------------------
    const hemiLight = new THREE.HemisphereLight(0xBAE6FD, 0x0A365A, 1.1);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.45);
    sunLight.position.set(30, 45, 25);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38BDF8, 0.48);
    fillLight.position.set(-25, 20, -20);
    scene.add(fillLight);

    // ----------------------------------------------------
    // Wave height function for seabed topography / rolling ocean waters
    // ----------------------------------------------------
    const getWaveHeight = (x: number, z: number, t: number): number => {
      // Balanced rolling ocean swell & bathymetric topography
      const w1 = Math.sin(x * 0.05 + t * 0.95) * Math.cos(z * 0.05 + t * 0.8) * 0.95;
      const w2 = Math.sin(x * 0.028 - z * 0.035 + t * 0.6) * 0.85;
      const w3 = Math.cos(x * 0.08 + z * 0.04 - t * 0.7) * 0.35;
      return w1 + w2 + w3;
    };

    // ----------------------------------------------------
    // 1. Ocean Surface: Plain Blue Plane vs. Moving Wave Bathymetry Mesh
    // ----------------------------------------------------
    let dynamicWaveGeo: THREE.PlaneGeometry | null = null;

    if (layers.bathymetry) {
      // MOVING WAVE-LIKE SEABED TOPOGRAPHY MESH (Replaces the plain blue plane)
      const waveGroup = new THREE.Group();

      // High-resolution subdivided terrain geometry (subdivided by 1 more step: 128x128)
      dynamicWaveGeo = new THREE.PlaneGeometry(240, 240, 128, 128);

      // Shaded faceted ocean surface - balanced rich ocean blue (just a bit darker)
      const waveMat = new THREE.MeshStandardMaterial({
        color: 0x146FAA, // Balanced, rich oceanic blue (just a bit darker)
        roughness: 0.28,
        metalness: 0.22,
        flatShading: true,
        side: THREE.DoubleSide,
      });
      const waveMesh = new THREE.Mesh(dynamicWaveGeo, waveMat);
      waveMesh.rotation.x = -Math.PI / 2;
      waveMesh.position.y = 0;
      waveGroup.add(waveMesh);

      // Glowing Cyan Topographical Bathymetry Contour Wireframe Overlay
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x38BDF8, // Glowing ocean cyan contour lines
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      const wireMesh = new THREE.Mesh(dynamicWaveGeo, wireMat);
      wireMesh.rotation.x = -Math.PI / 2;
      wireMesh.position.y = 0.02;
      waveGroup.add(wireMesh);

      // Sub-surface Bathymetric Grid floor (-14m depth shelf)
      const seabedGrid = new THREE.GridHelper(240, 24, 0x083D61, 0x04243A);
      seabedGrid.position.y = -10;
      waveGroup.add(seabedGrid);

      scene.add(waveGroup);
    } else {
      // PLAIN BLUE PLANE (Standard flat ocean plane - balanced rich blue)
      const oceanGroup = new THREE.Group();

      // Rich maritime blue ocean surface plane (just a bit darker)
      const oceanGeo = new THREE.PlaneGeometry(200, 200, 64, 64);
      const oceanMat = new THREE.MeshStandardMaterial({
        color: 0x1672AD, // Rich nautical blue (just a bit darker)
        roughness: 0.26,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });
      const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
      oceanMesh.rotation.x = -Math.PI / 2;
      oceanMesh.position.y = 0;
      oceanGroup.add(oceanMesh);

      // Electronic Navigational Chart (ENC) coordinate grid
      const navGrid = new THREE.GridHelper(200, 40, 0x38BDF8, 0x0E5482);
      navGrid.position.y = 0.015;
      (navGrid.material as THREE.Material).transparent = true;
      (navGrid.material as THREE.Material).opacity = 0.4;
      oceanGroup.add(navGrid);

      // Concentric Nautical Radar Range Rings around ship (5nm, 10nm, 15nm equivalents)
      [8, 16, 24, 32].forEach((radius, idx) => {
        const ringGeo = new THREE.RingGeometry(radius - 0.04, radius + 0.04, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38BDF8,
          transparent: true,
          opacity: idx === 1 ? 0.35 : 0.2,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        oceanGroup.add(ring);
      });

      scene.add(oceanGroup);
    }

    // ----------------------------------------------------
    // 1.5 Terrain Rendering (Removed as requested)
    // ----------------------------------------------------

    // ----------------------------------------------------
    // 2. AIS Yellow Corridor Curve & The 3D Oil Tanker Ship
    // ----------------------------------------------------
    const aisWaypoints = [
      new THREE.Vector3(-45, 0.1, 5.5),
      new THREE.Vector3(-22, 0.1, 2.8),
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(22, 0.1, -2.8),
      new THREE.Vector3(45, 0.1, -5.5)
    ];
    const aisCurve = new THREE.CatmullRomCurve3(aisWaypoints);

    const shipContainer = new THREE.Group();
    const tankerShip = createTankerShip();
    tankerShip.scale.set(1.35, 1.35, 1.35); // Prominent, clear and detailed
    tankerShip.position.set(0, 0, 0);
    tankerShip.rotation.y = 0; // Local +X is forward heading
    shipContainer.add(tankerShip);

    // Dynamic Propeller Wake & Foam Trail trailing behind the stern
    const wakeGeo = new THREE.PlaneGeometry(16, 3.2, 16, 4);
    const wakeMat = new THREE.MeshBasicMaterial({
      color: 0xCDEFFF,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const wakeMesh = new THREE.Mesh(wakeGeo, wakeMat);
    wakeMesh.rotation.x = -Math.PI / 2;
    wakeMesh.position.set(-11, 0.03, 0);
    shipContainer.add(wakeMesh);

    // Bow spray foam (port and starboard)
    [-0.8, 0.8].forEach((side) => {
      const bowSprayGeo = new THREE.PlaneGeometry(3.5, 0.8);
      const bowSprayMat = new THREE.MeshBasicMaterial({
        color: 0xE0F7FA,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide
      });
      const bowSpray = new THREE.Mesh(bowSprayGeo, bowSprayMat);
      bowSpray.rotation.x = -Math.PI / 2;
      bowSpray.rotation.z = side > 0 ? 0.3 : -0.3;
      bowSpray.position.set(6.2, 0.035, side * 0.6);
      shipContainer.add(bowSpray);
    });

    // Vessel contact shadow on the blue plane
    const shadowGeo = new THREE.PlaneGeometry(15, 3.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x011728,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.02, 0);
    shipContainer.add(shadowMesh);

    // Floating tactical AIS identification ring around ship
    const idRingGeo = new THREE.RingGeometry(9.2, 9.4, 48);
    const idRingMat = new THREE.MeshBasicMaterial({
      color: 0xF59E0B, // Amber AIS color
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const idRing = new THREE.Mesh(idRingGeo, idRingMat);
    idRing.rotation.x = -Math.PI / 2;
    idRing.position.y = 0.04;
    shipContainer.add(idRing);

    scene.add(shipContainer);

    // ----------------------------------------------------
    // 3. Observed Satellite Oil Slick (Sentinel-1 SAR)
    // ----------------------------------------------------
    const slickGroup = new THREE.Group();
    let dynamicSlickGeo: THREE.PlaneGeometry | null = null;
    let beaconMesh: THREE.Mesh | null = null;
    let pingRingMesh: THREE.Mesh | null = null;

    if (layers.slick) {
      const slickTex = createOilSlickTexture();
      dynamicSlickGeo = new THREE.PlaneGeometry(24, 18, 48, 36);
      const slickMat = new THREE.MeshStandardMaterial({
        map: slickTex,
        color: 0x18181C, // Deep pitch-black petroleum body
        transparent: true,
        roughness: 0.18,
        metalness: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const slickMesh = new THREE.Mesh(dynamicSlickGeo, slickMat);
      slickMesh.rotation.x = -Math.PI / 2;
      slickMesh.position.set(19, 0, 0);
      slickGroup.add(slickMesh);

      // Slick Centroid Detection Marker
      const beaconGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x10B981 });
      beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.set(18, 0.4, 0);
      slickGroup.add(beaconMesh);

      // Pulsing radar detection circle
      const pingRingGeo = new THREE.RingGeometry(2.8, 3.0, 32);
      const pingRingMat = new THREE.MeshBasicMaterial({
        color: 0x10B981,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      pingRingMesh = new THREE.Mesh(pingRingGeo, pingRingMat);
      pingRingMesh.rotation.x = -Math.PI / 2;
      pingRingMesh.position.set(18, 0.08, 0);
      slickGroup.add(pingRingMesh);
    }
    scene.add(slickGroup);

    // ----------------------------------------------------
    // 4. Lagrangian Backward Drift Trajectory & Particle Cloud
    // ----------------------------------------------------
    const trajGroup = new THREE.Group();
    const particleMeshes: THREE.Mesh[] = [];
    let trajCurve: THREE.QuadraticBezierCurve3 | null = null;
    let trajLine: THREE.Line | null = null;
    let trajGeo: THREE.BufferGeometry | null = null;
    let ellipseMesh: THREE.Mesh | null = null;

    if (layers.trajectories) {
      // Dynamic Curve connecting the observed slick (18, y, 0) backward to ship center
      trajCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(18, 0.2, 0),
        new THREE.Vector3(9, 2.5, 6),
        new THREE.Vector3(0, 0.2, 0)
      );

      const points = trajCurve.getPoints(60);
      trajGeo = new THREE.BufferGeometry().setFromPoints(points);
      const trajMat = new THREE.LineDashedMaterial({
        color: 0xEC4899, // Magenta Inferred drift line
        dashSize: 0.8,
        gapSize: 0.4,
        linewidth: 2
      });
      trajLine = new THREE.Line(trajGeo, trajMat);
      trajLine.computeLineDistances();
      trajGroup.add(trajLine);

      // Release point error ellipse right around ship origin
      const ellipseGeo = new THREE.RingGeometry(2.4, 2.6, 32);
      const ellipseMat = new THREE.MeshBasicMaterial({
        color: 0xEC4899,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      ellipseMesh = new THREE.Mesh(ellipseGeo, ellipseMat);
      ellipseMesh.rotation.x = -Math.PI / 2;
      ellipseMesh.position.set(0, 0.12, 0);
      trajGroup.add(ellipseMesh);

      // 45 Lagrangian simulation tracer particles
      const pGeo = new THREE.SphereGeometry(0.14, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({ color: 0xF472B6 });
      for (let i = 0; i < 45; i++) {
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.userData = {
          t: Math.random(),
          speed: 0.0018 + Math.random() * 0.002,
          offsetX: (Math.random() - 0.5) * 1.5,
          offsetY: Math.random() * 0.2,
          offsetZ: (Math.random() - 0.5) * 1.5
        };
        particleMeshes.push(pMesh);
        trajGroup.add(pMesh);
      }
    }
    scene.add(trajGroup);

    // ----------------------------------------------------
    // 5. AIS Multi-temporal Voyage Corridor Line (Yellow Trajectory)
    // ----------------------------------------------------
    const aisGroup = new THREE.Group();
    let aisLine: THREE.Line | null = null;
    let aisGeo: THREE.BufferGeometry | null = null;
    if (layers.vessels) {
      const aisPoints = aisCurve.getPoints(120);
      aisGeo = new THREE.BufferGeometry().setFromPoints(aisPoints);
      const aisMat = new THREE.LineDashedMaterial({
        color: 0xF59E0B, // Vibrant yellow/amber AIS corridor
        dashSize: 1.6,
        gapSize: 0.6
      });
      aisLine = new THREE.Line(aisGeo, aisMat);
      aisLine.computeLineDistances();
      aisGroup.add(aisLine);

      // Waypoint beacons along track
      aisWaypoints.forEach((wp) => {
        const wpGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 14);
        const wpMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B });
        const wpMesh = new THREE.Mesh(wpGeo, wpMat);
        wpMesh.position.copy(wp);
        aisGroup.add(wpMesh);
      });
    }
    scene.add(aisGroup);

    // ----------------------------------------------------
    // 6. Surface Current Vector Flow Arrows (HYCOM Ocean Currents in Red)
    // ----------------------------------------------------
    const currentGroup = new THREE.Group();
    const currentArrows: THREE.ArrowHelper[] = [];

    if (layers.currents) {
      const dir = new THREE.Vector3(0.85, 0, 0.5).normalize();
      for (let x = -40; x <= 40; x += 20) {
        for (let z = -40; z <= 40; z += 20) {
          const origin = new THREE.Vector3(x, 0.14, z);
          // Red HYCOM ocean current vector flow arrows
          const arrow = new THREE.ArrowHelper(dir, origin, 5.5, 0xEF4444, 1.3, 0.7);
          currentArrows.push(arrow);
          currentGroup.add(arrow);
        }
      }
    }
    scene.add(currentGroup);

    // ----------------------------------------------------
    // Camera Preset Angles (Respecting zoomed-out perspective)
    // ----------------------------------------------------
    const applyCameraPreset = (view: 'perspective' | 'top' | 'oblique') => {
      if (view === 'top') {
        camera.position.set(0, 95, 0.01);
        controls.target.set(0, 0, 0);
      } else if (view === 'oblique') {
        camera.position.set(64, 28, 52);
        controls.target.set(0, 0.5, 0);
      } else {
        camera.position.set(58, 48, 72);
        controls.target.set(0, 0.6, 0);
      }
      controls.update();
    };

    applyCameraPreset(cameraView);

    // ----------------------------------------------------
    // Animation Loop
    // ----------------------------------------------------
    let animId: number;
    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const t = (time || 0) * 0.0009; // Adjusted timescale as requested

      // Calculate vessel position and heading along the yellow AIS trajectory from timeCursor
      const progress = Math.max(0, Math.min(1, timeCursorRef.current));
      const currentPos = aisCurve.getPoint(progress);
      const tangent = aisCurve.getTangent(progress);
      const heading = Math.atan2(-tangent.z, tangent.x);

      // Animate moving wave mesh vertices if seabed topography is enabled
      if (dynamicWaveGeo) {
        const posAttr = dynamicWaveGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) {
          const vx = posAttr.getX(i);
          const vy = posAttr.getY(i);
          // With rotation.x = -PI/2, worldX = vx, worldZ = -vy
          const wx = vx;
          const wz = -vy;
          const h = getWaveHeight(wx, wz, t);
          posAttr.setZ(i, h);
        }
        posAttr.needsUpdate = true;
        dynamicWaveGeo.computeVertexNormals();

        // 3. Make ship model run directly on top of the water topography
        const cosH = Math.cos(heading);
        const sinH = Math.sin(heading);

        // Sample water height under bow, stern, port, starboard and center
        const bowX = currentPos.x + cosH * 5.2;
        const bowZ = currentPos.z - sinH * 5.2;
        const hBow = getWaveHeight(bowX, bowZ, t);

        const sternX = currentPos.x - cosH * 5.2;
        const sternZ = currentPos.z + sinH * 5.2;
        const hStern = getWaveHeight(sternX, sternZ, t);

        const hMid = getWaveHeight(currentPos.x, currentPos.z, t);

        const portX = currentPos.x - sinH * 1.3;
        const portZ = currentPos.z - cosH * 1.3;
        const hPort = getWaveHeight(portX, portZ, t);

        const stbdX = currentPos.x + sinH * 1.3;
        const stbdZ = currentPos.z + cosH * 1.3;
        const hStbd = getWaveHeight(stbdX, stbdZ, t);

        // Waterline sits right at the water surface
        const waterline = (hBow * 0.35 + hStern * 0.35 + hMid * 0.3);
        shipContainer.position.set(currentPos.x, waterline + 0.05, currentPos.z);

        // Dynamic pitch and roll matching physical wave slopes
        const pitchAngle = Math.atan2(hBow - hStern, 10.4);
        const rollAngle = Math.atan2(hStbd - hPort, 2.6);

        shipContainer.rotation.y = heading;
        shipContainer.rotation.x = -pitchAngle * 0.85;
        shipContainer.rotation.z = rollAngle * 0.75;

        // Project yellow AIS track line on top of the water topography
        if (aisLine && aisGeo) {
          const aisPosAttr = aisGeo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < aisPosAttr.count; i++) {
            const px = aisPosAttr.getX(i);
            const pz = aisPosAttr.getZ(i);
            const h = getWaveHeight(px, pz, t);
            aisPosAttr.setY(i, h + 0.12);
          }
          aisPosAttr.needsUpdate = true;
          aisLine.computeLineDistances();
        }
      } else {
        // Flat ocean plane motion
        shipContainer.position.set(currentPos.x, currentPos.y + Math.sin(t * 1.2) * 0.06, currentPos.z);
        shipContainer.rotation.y = heading;
        shipContainer.rotation.z = Math.sin(t * 1.0) * 0.012;
        shipContainer.rotation.x = Math.cos(t * 1.1) * 0.009;

        if (aisLine && aisGeo) {
          const aisPosAttr = aisGeo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < aisPosAttr.count; i++) {
            aisPosAttr.setY(i, 0.1);
          }
          aisPosAttr.needsUpdate = true;
          aisLine.computeLineDistances();
        }
      }

      // 4. Make the oil slick conform and float directly on top of the water topography
      if (dynamicSlickGeo) {
        const slickPosAttr = dynamicSlickGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < slickPosAttr.count; i++) {
          const vx = slickPosAttr.getX(i);
          const vy = slickPosAttr.getY(i);
          // slickMesh is at (19, 0, 0) rotated -PI/2 around X
          const wx = 19 + vx;
          const wz = -vy;
          const h = dynamicWaveGeo ? getWaveHeight(wx, wz, t) : 0;
          slickPosAttr.setZ(i, h + 0.08); // floats right on top of wave surface
        }
        slickPosAttr.needsUpdate = true;
        dynamicSlickGeo.computeVertexNormals();

        const slickH = dynamicWaveGeo ? getWaveHeight(18, 0, t) : 0;
        if (beaconMesh) beaconMesh.position.set(18, slickH + 0.45, 0);
        if (pingRingMesh) pingRingMesh.position.set(18, slickH + 0.1, 0);
      }

      // 5. Make the Lagrangian trajectory zero in directly on the exact center of the ship model!
      if (trajCurve && trajGeo && trajLine && ellipseMesh) {
        const shipCenter = shipContainer.position;
        const slickH = dynamicWaveGeo ? getWaveHeight(18, 0, t) : 0;
        const slickStart = new THREE.Vector3(18, slickH + 0.15, 0);
        const shipTarget = new THREE.Vector3(shipCenter.x, shipCenter.y + 0.15, shipCenter.z);

        const midX = (18 + shipCenter.x) * 0.5;
        const midZ = (0 + shipCenter.z) * 0.5 + 5.5;
        const midWaveH = dynamicWaveGeo ? getWaveHeight(midX, midZ, t) : 0;
        const midY = Math.max(slickStart.y, shipTarget.y, midWaveH) + 1.8;

        trajCurve.v0.copy(slickStart);
        trajCurve.v1.set(midX, midY, midZ);
        trajCurve.v2.copy(shipTarget); // ZEROED DIRECTLY ON THE SHIP MODEL CENTER

        const pts = trajCurve.getPoints(60);
        trajGeo.setFromPoints(pts);
        trajGeo.attributes.position.needsUpdate = true;
        trajLine.computeLineDistances();

        // Release ellipse centered right on ship model
        ellipseMesh.position.set(shipCenter.x, shipCenter.y + 0.1, shipCenter.z);

        // Animate tracer particles along the dynamic curve converging on ship center
        particleMeshes.forEach((p) => {
          p.userData.t += p.userData.speed;
          if (p.userData.t > 1) p.userData.t = 0;
          const curvePt = trajCurve.getPoint(p.userData.t);
          const convergence = 1 - p.userData.t * 0.85;
          p.position.set(
            curvePt.x + (p.userData.offsetX || 0) * convergence,
            curvePt.y + (p.userData.offsetY || 0) * convergence,
            curvePt.z + (p.userData.offsetZ || 0) * convergence
          );
        });
      }

      // Update red HYCOM current vector arrows to float on water topography or ocean plane
      if (currentArrows.length > 0) {
        currentArrows.forEach((arrow) => {
          const ax = arrow.position.x;
          const az = arrow.position.z;
          const ay = dynamicWaveGeo ? getWaveHeight(ax, az, t) + 0.2 : 0.14;
          arrow.position.y = ay;
        });
      }

      wakeMat.opacity = 0.3 + Math.sin(t * 3) * 0.08;

      controls.update();
      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    // ----------------------------------------------------
    // Resize Listener
    // ----------------------------------------------------
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 800;
      const h = mountRef.current.clientHeight || 600;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // Double measure after initial render to avoid 0x0 container size
    requestAnimationFrame(handleResize);
    const initialTimer = setTimeout(handleResize, 150);

    return () => {
      clearTimeout(initialTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [layers, cameraView, caseData]);

  // Quick Action Buttons (Enforcing zoom in & zoom out caps)
  const handleZoomIn = () => {
    if (cameraRef.current && controlsRef.current) {
      const currentDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
      if (currentDist > controlsRef.current.minDistance + 1) {
        cameraRef.current.position.sub(controlsRef.current.target).multiplyScalar(0.8).add(controlsRef.current.target);
        controlsRef.current.update();
      }
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current && controlsRef.current) {
      const currentDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
      if (currentDist < controlsRef.current.maxDistance - 2) {
        cameraRef.current.position.sub(controlsRef.current.target).multiplyScalar(1.25).add(controlsRef.current.target);
        controlsRef.current.update();
      }
    }
  };

  const handleCenterShip = () => {
    if (cameraRef.current && controlsRef.current) {
      controlsRef.current.target.set(0, 0.6, 0);
      cameraRef.current.position.set(58, 48, 72);
      controlsRef.current.update();
    }
  };

  return (
    <div ref={mountRef} className="w-full h-full relative overflow-hidden bg-[#041624] select-none">
      {/* Interactive Map Quick-Action Controls */}
      <div className="absolute top-16 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
          className="w-8 h-8 rounded-[6px] bg-[#0A2640]/90 hover:bg-[#0E355A] text-white border border-[#1E4E78] shadow-md flex items-center justify-center cursor-pointer transition-colors"
        >
          <ZoomIn className="w-4 h-4 text-cyan-300" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="w-8 h-8 rounded-[6px] bg-[#0A2640]/90 hover:bg-[#0E355A] text-white border border-[#1E4E78] shadow-md flex items-center justify-center cursor-pointer transition-colors"
        >
          <ZoomOut className="w-4 h-4 text-cyan-300" />
        </button>
        <button
          onClick={handleCenterShip}
          title="Focus on Ship"
          aria-label="Focus on Ship"
          className="w-8 h-8 rounded-[6px] bg-[#0A2640]/90 hover:bg-[#0E355A] text-white border border-[#1E4E78] shadow-md flex items-center justify-center cursor-pointer transition-colors"
        >
          <Navigation className="w-4 h-4 text-amber-400" />
        </button>
      </div>
    </div>
  );
};
