import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTankerShip } from '../workspace/TankerShip';
import { createOilSlickTexture } from '../workspace/Scene3D';

export const GapFigure: React.FC = () => {
  const [sliderVal, setSliderVal] = useState<number>(50); // Default at 50% where vessel intersects the spillage origin
  const sliderRef = useRef<number>(50);
  sliderRef.current = sliderVal;

  const mountRef = useRef<HTMLDivElement | null>(null);

  // Balanced rolling ocean swell & bathymetric topography wave function
  const getWaveHeight = (x: number, z: number, t: number): number => {
    const w1 = Math.sin(x * 0.05 + t * 0.95) * Math.cos(z * 0.05 + t * 0.8) * 0.95;
    const w2 = Math.sin(x * 0.028 - z * 0.035 + t * 0.6) * 0.85;
    const w3 = Math.cos(x * 0.08 + z * 0.04 - t * 0.7) * 0.35;
    return w1 + w2 + w3;
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    // ----------------------------------------------------
    // Scene & Camera
    // ----------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061D33); // Dark nautical deep sea atmosphere

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 400);
    camera.position.set(38, 30, 48);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom = false; // Zoom disabled per user request
    controls.target.set(0, 0.6, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent dipping beneath sea floor

    // ----------------------------------------------------
    // Lighting
    // ----------------------------------------------------
    const hemiLight = new THREE.HemisphereLight(0xBAE6FD, 0x0A365A, 1.15);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.45);
    sunLight.position.set(30, 45, 25);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38BDF8, 0.48);
    fillLight.position.set(-25, 20, -20);
    scene.add(fillLight);

    // ----------------------------------------------------
    // 1. Water Topology: Moving Bathymetry Wave Mesh
    // ----------------------------------------------------
    const waveGroup = new THREE.Group();
    const dynamicWaveGeo = new THREE.PlaneGeometry(240, 240, 110, 110);

    // Rich nautical blue shaded ocean surface
    const waveMat = new THREE.MeshStandardMaterial({
      color: 0x146FAA,
      roughness: 0.28,
      metalness: 0.22,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const waveMesh = new THREE.Mesh(dynamicWaveGeo, waveMat);
    waveMesh.rotation.x = -Math.PI / 2;
    waveGroup.add(waveMesh);

    // Glowing cyan topographical contour overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38BDF8,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const wireMesh = new THREE.Mesh(dynamicWaveGeo, wireMat);
    wireMesh.rotation.x = -Math.PI / 2;
    wireMesh.position.y = 0.02;
    waveGroup.add(wireMesh);

    // Sub-surface bathymetric grid floor (-10m depth shelf)
    const seabedGrid = new THREE.GridHelper(240, 24, 0x083D61, 0x04243A);
    seabedGrid.position.y = -10;
    waveGroup.add(seabedGrid);

    scene.add(waveGroup);

    // ----------------------------------------------------
    // 2. AIS Yellow Trajectory Corridor & Waypoints
    // Passing directly through (0, 0.1, 0) - The Spill Origin!
    // ----------------------------------------------------
    const aisWaypoints = [
      new THREE.Vector3(-45, 0.1, 5.5),
      new THREE.Vector3(-22, 0.1, 2.8),
      new THREE.Vector3(0, 0.1, 0), // Intersecting spillage point
      new THREE.Vector3(22, 0.1, -2.8),
      new THREE.Vector3(45, 0.1, -5.5)
    ];
    const aisCurve = new THREE.CatmullRomCurve3(aisWaypoints);

    const aisGroup = new THREE.Group();
    const aisPoints = aisCurve.getPoints(120);
    const aisGeo = new THREE.BufferGeometry().setFromPoints(aisPoints);
    const aisMat = new THREE.LineDashedMaterial({
      color: 0xF59E0B, // Vibrant yellow/amber AIS corridor
      dashSize: 1.6,
      gapSize: 0.6,
      linewidth: 2
    });
    const aisLine = new THREE.Line(aisGeo, aisMat);
    aisLine.computeLineDistances();
    aisGroup.add(aisLine);

    // Waypoint markers along track
    aisWaypoints.forEach((wp) => {
      const wpGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16);
      const wpMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B });
      const wpMesh = new THREE.Mesh(wpGeo, wpMat);
      wpMesh.position.copy(wp);
      aisGroup.add(wpMesh);
    });
    scene.add(aisGroup);

    // ----------------------------------------------------
    // 3. Tanker Ship Model running along the trajectory
    // ----------------------------------------------------
    const shipContainer = new THREE.Group();
    const tankerShip = createTankerShip();
    tankerShip.scale.set(1.3, 1.3, 1.3);
    shipContainer.add(tankerShip);

    // Propeller Wake trailing behind the stern
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

    // Bow spray foam
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

    // Vessel Tactical AIS Identification Ring
    const idRingGeo = new THREE.RingGeometry(9.2, 9.4, 48);
    const idRingMat = new THREE.MeshBasicMaterial({
      color: 0xF59E0B,
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
    // 4. Spill Release Origin (Discharge Intersection Point at 0, 0, 0)
    // ----------------------------------------------------
    const spillGroup = new THREE.Group();

    // Spillage origin beacon cylinder
    const spillBeaconGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16);
    const spillBeaconMat = new THREE.MeshBasicMaterial({ color: 0xEC4899 });
    const spillBeacon = new THREE.Mesh(spillBeaconGeo, spillBeaconMat);
    spillBeacon.position.set(0, 0.4, 0);
    spillGroup.add(spillBeacon);

    // Spillage Release Confidence Ellipse
    const spillEllipseGeo = new THREE.RingGeometry(2.4, 2.6, 32);
    const spillEllipseMat = new THREE.MeshBasicMaterial({
      color: 0xEC4899,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const spillEllipse = new THREE.Mesh(spillEllipseGeo, spillEllipseMat);
    spillEllipse.rotation.x = -Math.PI / 2;
    spillEllipse.position.set(0, 0.12, 0);
    spillGroup.add(spillEllipse);

    // Concentric pulsating warning ring
    const spillRingGeo = new THREE.RingGeometry(4.8, 5.0, 32);
    const spillRingMat = new THREE.MeshBasicMaterial({
      color: 0xF43F5E,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const spillRing = new THREE.Mesh(spillRingGeo, spillRingMat);
    spillRing.rotation.x = -Math.PI / 2;
    spillRing.position.set(0, 0.1, 0);
    spillGroup.add(spillRing);

    scene.add(spillGroup);

    // ----------------------------------------------------
    // 5. Observed Crude Oil Slick (Displaced by Drift to 19, 0, 0)
    // ----------------------------------------------------
    const slickGroup = new THREE.Group();
    const slickTex = createOilSlickTexture();
    const dynamicSlickGeo = new THREE.PlaneGeometry(24, 18, 48, 36);
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
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(18, 0.4, 0);
    slickGroup.add(beaconMesh);

    // Pulsing radar detection circle
    const pingRingGeo = new THREE.RingGeometry(2.8, 3.0, 32);
    const pingRingMat = new THREE.MeshBasicMaterial({
      color: 0x10B981,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const pingRingMesh = new THREE.Mesh(pingRingGeo, pingRingMat);
    pingRingMesh.rotation.x = -Math.PI / 2;
    pingRingMesh.position.set(18, 0.1, 0);
    slickGroup.add(pingRingMesh);

    scene.add(slickGroup);

    // ----------------------------------------------------
    // 6. Surface Current Vector Flow Arrows (HYCOM in Red)
    // ----------------------------------------------------
    const currentGroup = new THREE.Group();
    const currentArrows: THREE.ArrowHelper[] = [];
    const dir = new THREE.Vector3(0.85, 0, 0.5).normalize();
    for (let x = -40; x <= 40; x += 20) {
      for (let z = -35; z <= 35; z += 20) {
        const origin = new THREE.Vector3(x, 0.14, z);
        const arrow = new THREE.ArrowHelper(dir, origin, 5.5, 0xEF4444, 1.3, 0.7);
        currentArrows.push(arrow);
        currentGroup.add(arrow);
      }
    }
    scene.add(currentGroup);

    // ----------------------------------------------------
    // Animation Loop:
    // Waves move strictly when the slider is moved!
    // Ship scrubs back and forth along the trajectory!
    // ----------------------------------------------------
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Waves move ONLY when the slider is moved (locked strictly to slider progress)
      const sliderFraction = Math.max(0, Math.min(1, sliderRef.current / 100));
      const t = sliderFraction * 14.0;

      // 1. Move ship model back and forth along AIS trajectory based on slider
      const currentPos = aisCurve.getPoint(sliderFraction);
      const tangent = aisCurve.getTangent(sliderFraction);
      const heading = Math.atan2(-tangent.z, tangent.x);

      // 2. Animate moving wave mesh vertices
      const posAttr = dynamicWaveGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const wx = vx;
        const wz = -vy;
        const h = getWaveHeight(wx, wz, t);
        posAttr.setZ(i, h);
      }
      posAttr.needsUpdate = true;
      dynamicWaveGeo.computeVertexNormals();

      // 3. Make ship model conform and ride directly on water topography
      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
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

      const waterline = hBow * 0.35 + hStern * 0.35 + hMid * 0.3;
      shipContainer.position.set(currentPos.x, waterline + 0.05, currentPos.z);

      const pitchAngle = Math.atan2(hBow - hStern, 10.4);
      const rollAngle = Math.atan2(hStbd - hPort, 2.6);
      shipContainer.rotation.y = heading;
      shipContainer.rotation.x = -pitchAngle * 0.85;
      shipContainer.rotation.z = rollAngle * 0.75;

      // Project AIS track line onto the wave surface
      const aisPosAttr = aisGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < aisPosAttr.count; i++) {
        const px = aisPosAttr.getX(i);
        const pz = aisPosAttr.getZ(i);
        const h = getWaveHeight(px, pz, t);
        aisPosAttr.setY(i, h + 0.12);
      }
      aisPosAttr.needsUpdate = true;
      aisLine.computeLineDistances();

      // 4. Make oil slick conform and float directly on the water topography
      const slickPosAttr = dynamicSlickGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < slickPosAttr.count; i++) {
        const vx = slickPosAttr.getX(i);
        const vy = slickPosAttr.getY(i);
        const wx = 19 + vx;
        const wz = -vy;
        const h = getWaveHeight(wx, wz, t);
        slickPosAttr.setZ(i, h + 0.08);
      }
      slickPosAttr.needsUpdate = true;
      dynamicSlickGeo.computeVertexNormals();

      const slickH = getWaveHeight(18, 0, t);
      beaconMesh.position.set(18, slickH + 0.45, 0);
      pingRingMesh.position.set(18, slickH + 0.1, 0);

      // Spill point beacon elevation on the water
      const spillH = getWaveHeight(0, 0, t);
      spillBeacon.position.set(0, spillH + 0.4, 0);
      spillEllipse.position.set(0, spillH + 0.12, 0);
      spillRing.position.set(0, spillH + 0.1, 0);

      // Pulsing radar rings
      const pulse = 1 + Math.sin(t * 3.5) * 0.18;
      pingRingMesh.scale.set(pulse, pulse, pulse);
      const spillPulse = 1 + Math.sin(t * 4.0) * 0.15;
      spillRing.scale.set(spillPulse, spillPulse, spillPulse);

      // 5. Update red HYCOM current vector arrows to float on waves
      currentArrows.forEach((arrow) => {
        const ax = arrow.position.x;
        const az = arrow.position.z;
        const ay = getWaveHeight(ax, az, t) + 0.2;
        arrow.position.y = ay;
      });

      wakeMat.opacity = 0.3 + Math.sin(t * 3) * 0.08;

      controls.update();
      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // Resize handling
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 800;
      const h = mountRef.current.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
      dynamicWaveGeo.dispose();
      waveMat.dispose();
      wireMat.dispose();
      dynamicSlickGeo.dispose();
      slickMat.dispose();
      aisGeo.dispose();
      aisMat.dispose();
      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="w-full space-y-3">
      {/* Top Controls Bar with Interactive Vessel Track & Wave Slider */}
      <div className="flex items-center justify-end pb-3 border-b border-white/20">
        <input
          id="ship-slider"
          type="range"
          min="0"
          max="100"
          value={sliderVal}
          onChange={(e) => setSliderVal(Number(e.target.value))}
          className="w-48 sm:w-64 h-2 bg-white/40 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none focus:ring-2 focus:ring-white/60 [&::-webkit-slider-runnable-track]:bg-white/40 [&::-webkit-slider-runnable-track]:rounded-lg [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:-mt-1 [&::-moz-range-track]:bg-white/40 [&::-moz-range-track]:rounded-lg [&::-moz-range-track]:h-2 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
        />
      </div>

      {/* 3D WebGL Viewport Window */}
      <div className="relative w-full h-[430px] sm:h-[480px] bg-slate-950/80 rounded-lg overflow-hidden border border-white/30 shadow-2xl">
        {/* Three.js Canvas Container */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      </div>
    </div>
  );
};
