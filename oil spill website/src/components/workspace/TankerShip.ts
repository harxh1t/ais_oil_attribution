import * as THREE from 'three';

/**
 * Creates a detailed 3D model of a commercial crude oil tanker vessel
 * matching the exact livery and geometry from the reference render:
 * - Red antifouling lower hull with bulbous bow
 * - Black upper hull with white waterline stripe and mid-forward hull accent panel
 * - Terracotta/red main deck with flared forecastle
 * - Multi-tiered white accommodation superstructure with extended bridge wings
 * - Twin aft exhaust funnels and enclosed davit lifeboats
 * - Detailed midship cargo piping banks, elevated catwalk, and manifold cranes
 */
export function createTankerShip(): THREE.Group {
  const ship = new THREE.Group();

  // ----------------------------------------------------
  // Shared Materials
  // ----------------------------------------------------
  const hullRedMat = new THREE.MeshStandardMaterial({
    color: 0x9B2824, // Antifouling red lower hull
    roughness: 0.55,
    metalness: 0.1,
  });

  const hullBlackMat = new THREE.MeshStandardMaterial({
    color: 0x16181B, // Black upper topsides
    roughness: 0.45,
    metalness: 0.15,
  });

  const hullAccentWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xDCE0E5, // Off-white midship hull accent panel & waterline stripe
    roughness: 0.4,
    metalness: 0.1,
  });

  const deckRedMat = new THREE.MeshStandardMaterial({
    color: 0x8C332B, // Terracotta/red deck plate
    roughness: 0.65,
    metalness: 0.05,
  });

  const superstructureMat = new THREE.MeshStandardMaterial({
    color: 0xF2F5F8, // Crisp white accommodation deckhouse & cranes
    roughness: 0.35,
    metalness: 0.1,
  });

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x162334, // Dark tinted wheelhouse windows
    roughness: 0.15,
    metalness: 0.7,
  });

  const pipeSilverMat = new THREE.MeshStandardMaterial({
    color: 0xE2E7EC, // White/silver cargo piping
    roughness: 0.35,
    metalness: 0.35,
  });

  const pipeDarkMat = new THREE.MeshStandardMaterial({
    color: 0x485058, // Dark gray pipe brackets & valve manifolds
    roughness: 0.5,
    metalness: 0.4,
  });

  const catwalkMat = new THREE.MeshStandardMaterial({
    color: 0xC8CFD6, // Light gray catwalk & deck machinery
    roughness: 0.5,
    metalness: 0.3,
  });

  const funnelMat = new THREE.MeshStandardMaterial({
    color: 0x18191C, // Matte black exhaust funnels
    roughness: 0.4,
    metalness: 0.2,
  });

  const lifeboatMat = new THREE.MeshStandardMaterial({
    color: 0xE85D22, // High-visibility orange lifeboats
    roughness: 0.4,
    metalness: 0.1,
  });

  // Scale constants: Length ~ 10 units, Beam ~ 1.8 units, Depth ~ 1.1 units
  const L = 10.0;
  const W = 1.8;
  const midL = 6.2; // length of parallel midbody

  // ----------------------------------------------------
  // 1. Lower Hull (Red Below Waterline)
  // ----------------------------------------------------
  // Main midbody bottom
  const lowerMidGeo = new THREE.BoxGeometry(midL, 0.45, W * 0.94);
  const lowerMid = new THREE.Mesh(lowerMidGeo, hullRedMat);
  lowerMid.position.set(-0.2, -0.225, 0);
  ship.add(lowerMid);

  // Lower bow wedge (tapering to bulbous bow)
  const lowerBowShape = new THREE.Shape();
  lowerBowShape.moveTo(midL / 2 - 0.2, -W * 0.47);
  lowerBowShape.lineTo(midL / 2 + 1.8, 0);
  lowerBowShape.lineTo(midL / 2 - 0.2, W * 0.47);
  lowerBowShape.closePath();

  const lowerBowGeo = new THREE.ExtrudeGeometry(lowerBowShape, {
    depth: 0.45,
    bevelEnabled: false,
  });
  const lowerBow = new THREE.Mesh(lowerBowGeo, hullRedMat);
  lowerBow.rotation.x = Math.PI / 2;
  lowerBow.position.y = 0;
  ship.add(lowerBow);

  // Bulbous bow protruding underwater at forward foot
  const bulbGeo = new THREE.SphereGeometry(0.32, 16, 12);
  bulbGeo.scale(1.8, 0.85, 0.95);
  const bulb = new THREE.Mesh(bulbGeo, hullRedMat);
  bulb.position.set(midL / 2 + 1.85, -0.26, 0);
  ship.add(bulb);

  // Lower stern taper
  const lowerSternShape = new THREE.Shape();
  lowerSternShape.moveTo(-midL / 2 - 0.2, -W * 0.47);
  lowerSternShape.lineTo(-midL / 2 - 1.5, -W * 0.25);
  lowerSternShape.lineTo(-midL / 2 - 1.5, W * 0.25);
  lowerSternShape.lineTo(-midL / 2 - 0.2, W * 0.47);
  lowerSternShape.closePath();

  const lowerSternGeo = new THREE.ExtrudeGeometry(lowerSternShape, {
    depth: 0.45,
    bevelEnabled: false,
  });
  const lowerStern = new THREE.Mesh(lowerSternGeo, hullRedMat);
  lowerStern.rotation.x = Math.PI / 2;
  lowerStern.position.y = 0;
  ship.add(lowerStern);

  // ----------------------------------------------------
  // 2. Waterline Stripe (White / Light-gray)
  // ----------------------------------------------------
  const bootGeo = new THREE.BoxGeometry(midL + 0.05, 0.05, W * 0.99);
  const bootMesh = new THREE.Mesh(bootGeo, hullAccentWhiteMat);
  bootMesh.position.set(-0.2, 0.025, 0);
  ship.add(bootMesh);

  // ----------------------------------------------------
  // 3. Upper Hull (Black Topsides with White Mid-Forward Panel)
  // ----------------------------------------------------
  // Main midbody hull (black)
  const upperMidGeo = new THREE.BoxGeometry(midL, 0.55, W);
  const upperMid = new THREE.Mesh(upperMidGeo, hullBlackMat);
  upperMid.position.set(-0.2, 0.32, 0);
  ship.add(upperMid);

  // Distinctive white accent hull panel (as seen in reference image.png)
  const accentPanelGeo = new THREE.BoxGeometry(1.6, 0.54, W + 0.02);
  const accentPanel = new THREE.Mesh(accentPanelGeo, hullAccentWhiteMat);
  accentPanel.position.set(0.6, 0.32, 0);
  ship.add(accentPanel);

  // Upper Bow (flaring out to pointed prow)
  const upperBowShape = new THREE.Shape();
  upperBowShape.moveTo(midL / 2 - 0.2, -W * 0.5);
  upperBowShape.bezierCurveTo(
    midL / 2 + 0.9, -W * 0.46,
    midL / 2 + 1.7, -W * 0.2,
    midL / 2 + 2.1, 0
  );
  upperBowShape.bezierCurveTo(
    midL / 2 + 1.7, W * 0.2,
    midL / 2 + 0.9, W * 0.46,
    midL / 2 - 0.2, W * 0.5
  );
  upperBowShape.closePath();

  const upperBowGeo = new THREE.ExtrudeGeometry(upperBowShape, {
    depth: 0.6,
    bevelEnabled: false,
  });
  const upperBow = new THREE.Mesh(upperBowGeo, hullBlackMat);
  upperBow.rotation.x = Math.PI / 2;
  upperBow.position.y = 0.6;
  ship.add(upperBow);

  // Upper Stern (curved transom stern)
  const upperSternShape = new THREE.Shape();
  upperSternShape.moveTo(-midL / 2 - 0.2, -W * 0.5);
  upperSternShape.bezierCurveTo(
    -midL / 2 - 1.2, -W * 0.48,
    -midL / 2 - 1.7, -W * 0.35,
    -midL / 2 - 1.8, 0
  );
  upperSternShape.bezierCurveTo(
    -midL / 2 - 1.7, W * 0.35,
    -midL / 2 - 1.2, W * 0.48,
    -midL / 2 - 0.2, W * 0.5
  );
  upperSternShape.closePath();

  const upperSternGeo = new THREE.ExtrudeGeometry(upperSternShape, {
    depth: 0.58,
    bevelEnabled: false,
  });
  const upperStern = new THREE.Mesh(upperSternGeo, hullBlackMat);
  upperStern.rotation.x = Math.PI / 2;
  upperStern.position.y = 0.59;
  ship.add(upperStern);

  // ----------------------------------------------------
  // 4. Main Deck (Red/Terracotta Deck Plate + Bulwarks)
  // ----------------------------------------------------
  const deckPlateGeo = new THREE.BoxGeometry(midL + 0.1, 0.04, W - 0.08);
  const deckPlate = new THREE.Mesh(deckPlateGeo, deckRedMat);
  deckPlate.position.set(-0.2, 0.6, 0);
  ship.add(deckPlate);

  // Port and Starboard Deck Bulwarks (side edges)
  const bulwarkGeo = new THREE.BoxGeometry(midL, 0.08, 0.04);
  const bulwarkPort = new THREE.Mesh(bulwarkGeo, hullBlackMat);
  bulwarkPort.position.set(-0.2, 0.64, W / 2 - 0.02);
  ship.add(bulwarkPort);

  const bulwarkStbd = new THREE.Mesh(bulwarkGeo, hullBlackMat);
  bulwarkStbd.position.set(-0.2, 0.64, -W / 2 + 0.02);
  ship.add(bulwarkStbd);

  // ----------------------------------------------------
  // 5. Forecastle (Bow Deck & Gear)
  // ----------------------------------------------------
  // Raised forecastle plate (red)
  const forecastlePlateGeo = new THREE.BoxGeometry(1.6, 0.06, W * 0.75);
  const forecastlePlate = new THREE.Mesh(forecastlePlateGeo, deckRedMat);
  forecastlePlate.position.set(midL / 2 + 0.8, 0.62, 0);
  ship.add(forecastlePlate);

  // V-shaped wave breakwater protecting the cargo piping
  const breakwaterGeo = new THREE.BoxGeometry(0.08, 0.18, W * 0.8);
  const breakwater = new THREE.Mesh(breakwaterGeo, deckRedMat);
  breakwater.position.set(midL / 2 - 0.3, 0.68, 0);
  ship.add(breakwater);

  // Breakwater top lip (white)
  const breakwaterLipGeo = new THREE.BoxGeometry(0.1, 0.03, W * 0.82);
  const breakwaterLip = new THREE.Mesh(breakwaterLipGeo, superstructureMat);
  breakwaterLip.position.set(midL / 2 - 0.3, 0.78, 0);
  ship.add(breakwaterLip);

  // Forecastle Winches (Anchor windlass)
  const winchGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12);
  const winch1 = new THREE.Mesh(winchGeo, catwalkMat);
  winch1.rotation.z = Math.PI / 2;
  winch1.position.set(midL / 2 + 0.8, 0.68, 0.3);
  ship.add(winch1);

  const winch2 = new THREE.Mesh(winchGeo, catwalkMat);
  winch2.rotation.z = Math.PI / 2;
  winch2.position.set(midL / 2 + 0.8, 0.68, -0.3);
  ship.add(winch2);

  // Forecastle Mast (white)
  const foremastPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 0.95, 8),
    superstructureMat
  );
  foremastPole.position.set(midL / 2 + 1.25, 1.05, 0);
  ship.add(foremastPole);

  // Foremast crossarm & navigation lantern
  const crossarm = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.03, 0.36),
    superstructureMat
  );
  crossarm.position.set(midL / 2 + 1.25, 1.35, 0);
  ship.add(crossarm);

  // ----------------------------------------------------
  // 6. Midship Cargo Piping & Elevated Catwalk
  // ----------------------------------------------------
  // Catwalk (Flying Gangway running along centerline)
  const catwalkLength = midL - 0.6;
  const catwalkGeo = new THREE.BoxGeometry(catwalkLength, 0.04, 0.24);
  const catwalk = new THREE.Mesh(catwalkGeo, catwalkMat);
  catwalk.position.set(-0.3, 0.78, 0);
  ship.add(catwalk);

  // Catwalk Stanchions / Support Pillars
  for (let x = -midL / 2 + 0.4; x <= midL / 2 - 0.6; x += 0.8) {
    const stanchion = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.18, 0.24),
      catwalkMat
    );
    stanchion.position.set(x, 0.69, 0);
    ship.add(stanchion);
  }

  // Longitudinal Cargo Pipes (Silver/White)
  // 3 pipes on port side of catwalk, 3 pipes on starboard side
  const pipeOffsets = [0.22, 0.36, 0.50, -0.22, -0.36, -0.50];
  pipeOffsets.forEach((zOffset, idx) => {
    const pipeGeo = new THREE.CylinderGeometry(0.032, 0.032, catwalkLength - 0.2, 10);
    const pipe = new THREE.Mesh(pipeGeo, pipeSilverMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(-0.3, 0.67 + (idx % 2 === 0 ? 0.015 : 0), zOffset);
    ship.add(pipe);
  });

  // Secondary elevated pipe pair directly on top of catwalk sides
  const topPipeP = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, catwalkLength - 0.3, 8),
    pipeSilverMat
  );
  topPipeP.rotation.z = Math.PI / 2;
  topPipeP.position.set(-0.3, 0.82, 0.08);
  ship.add(topPipeP);

  const topPipeS = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, catwalkLength - 0.3, 8),
    pipeSilverMat
  );
  topPipeS.rotation.z = Math.PI / 2;
  topPipeS.position.set(-0.3, 0.82, -0.08);
  ship.add(topPipeS);

  // Transverse Pipe Racks & Expansion Loops (crossing port to starboard)
  const loopPositions = [-2.2, -1.0, 0.8, 2.0];
  loopPositions.forEach((xPos) => {
    // Cross bridge frame (dark)
    const crossBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 1.25),
      pipeDarkMat
    );
    crossBridge.position.set(xPos, 0.71, 0);
    ship.add(crossBridge);

    // Arched expansion loop pipe across
    const loopPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 1.22, 8),
      pipeSilverMat
    );
    loopPipe.rotation.x = Math.PI / 2;
    loopPipe.position.set(xPos, 0.77, 0);
    ship.add(loopPipe);
  });

  // Midship Cargo Manifold Station (Center point, x = -0.1)
  const manifoldPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.08, 1.55),
    pipeDarkMat
  );
  manifoldPlinth.position.set(-0.1, 0.64, 0);
  ship.add(manifoldPlinth);

  // Manifold cross pipes extending to ship's side rails
  for (let i = -0.2; i <= 0.2; i += 0.12) {
    const mPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 1.6, 10),
      pipeSilverMat
    );
    mPipe.rotation.x = Math.PI / 2;
    mPipe.position.set(-0.1 + i, 0.72, 0);
    ship.add(mPipe);
  }

  // Midship Hose-Handling Cranes (White, port and starboard)
  [-0.65, 0.65].forEach((zSign) => {
    const craneBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.35, 10),
      superstructureMat
    );
    craneBase.position.set(-0.1, 0.77, zSign);
    ship.add(craneBase);

    // Crane boom angled upward
    const boomGeo = new THREE.BoxGeometry(0.5, 0.04, 0.04);
    const craneBoom = new THREE.Mesh(boomGeo, superstructureMat);
    craneBoom.position.set(-0.1, 1.05, zSign);
    craneBoom.rotation.z = Math.PI / 6;
    craneBoom.rotation.y = zSign > 0 ? Math.PI / 4 : -Math.PI / 4;
    ship.add(craneBoom);
  });

  // Deck Hatch Covers / Butterworth Openings (small white/silver cylinders)
  for (let x = -2.6; x <= 2.2; x += 1.1) {
    [-0.7, 0.7].forEach((zSide) => {
      const hatch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12),
        superstructureMat
      );
      hatch.position.set(x, 0.63, zSide);
      ship.add(hatch);
    });
  }

  // ----------------------------------------------------
  // 7. Superstructure (Aft Accommodation & Wheelhouse)
  // ----------------------------------------------------
  const deckhouseX = -midL / 2 - 0.2; // approx -3.3

  // Tier 1: Main Accommodation Block
  const tier1Geo = new THREE.BoxGeometry(1.4, 0.38, 1.35);
  const tier1 = new THREE.Mesh(tier1Geo, superstructureMat);
  tier1.position.set(deckhouseX, 0.79, 0);
  ship.add(tier1);

  // Tier 2: Upper Accommodation Deck
  const tier2Geo = new THREE.BoxGeometry(1.25, 0.3, 1.25);
  const tier2 = new THREE.Mesh(tier2Geo, superstructureMat);
  tier2.position.set(deckhouseX - 0.05, 1.12, 0);
  ship.add(tier2);

  // Tier 3: Boat Deck
  const tier3Geo = new THREE.BoxGeometry(1.1, 0.26, 1.15);
  const tier3 = new THREE.Mesh(tier3Geo, superstructureMat);
  tier3.position.set(deckhouseX - 0.08, 1.39, 0);
  ship.add(tier3);

  // Tier 4: Navigation Bridge & Extended Wings (Signatures of a modern supertanker)
  // Main wheelhouse box
  const bridgeGeo = new THREE.BoxGeometry(0.75, 0.24, 1.05);
  const bridge = new THREE.Mesh(bridgeGeo, superstructureMat);
  bridge.position.set(deckhouseX + 0.05, 1.63, 0);
  ship.add(bridge);

  // Bridge Wings spanning full ship beam (W) to overhang sides
  const wingsGeo = new THREE.BoxGeometry(0.45, 0.16, W * 1.06);
  const wings = new THREE.Mesh(wingsGeo, superstructureMat);
  wings.position.set(deckhouseX + 0.05, 1.63, 0);
  ship.add(wings);

  // Panoramic Wheelhouse Window Band (Dark glass)
  const windowBandGeo = new THREE.BoxGeometry(0.12, 0.12, W * 1.04);
  const windowBand = new THREE.Mesh(windowBandGeo, windowMat);
  windowBand.position.set(deckhouseX + 0.26, 1.66, 0);
  ship.add(windowBand);

  // Monkey Island (Wheelhouse Roof)
  const monkeyIslandGeo = new THREE.BoxGeometry(0.72, 0.04, 1.0);
  const monkeyIsland = new THREE.Mesh(monkeyIslandGeo, superstructureMat);
  monkeyIsland.position.set(deckhouseX + 0.05, 1.77, 0);
  ship.add(monkeyIsland);

  // Main Radar Mast on Monkey Island
  const mainMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.04, 0.65, 8),
    superstructureMat
  );
  mainMast.position.set(deckhouseX + 0.05, 2.1, 0);
  ship.add(mainMast);

  // Radar Scanner Bar (Top crossarm)
  const radarCross = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.03, 0.35),
    superstructureMat
  );
  radarCross.position.set(deckhouseX + 0.05, 2.38, 0);
  ship.add(radarCross);

  // Satellite Communication Radomes (Twin white spheres)
  [-0.24, 0.24].forEach((zDome) => {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 12, 10),
      superstructureMat
    );
    dome.position.set(deckhouseX - 0.12, 1.86, zDome);
    ship.add(dome);
  });

  // ----------------------------------------------------
  // 8. Twin Exhaust Funnels (Aft of Bridge)
  // ----------------------------------------------------
  [-0.25, 0.25].forEach((zFunnel) => {
    // Outer funnel casing (matte black)
    const funnelGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.55, 12);
    funnelGeo.scale(1.25, 1.0, 0.85); // streamline
    const funnel = new THREE.Mesh(funnelGeo, funnelMat);
    funnel.position.set(deckhouseX - 0.55, 1.5, zFunnel);
    funnel.rotation.z = -0.15; // slightly raked aft
    ship.add(funnel);

    // Inner exhaust pipe top
    const pipeTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.12, 10),
      pipeDarkMat
    );
    pipeTop.position.set(deckhouseX - 0.58, 1.8, zFunnel);
    ship.add(pipeTop);
  });

  // ----------------------------------------------------
  // 9. Lifeboats on Davits (Orange capsules on port and stbd)
  // ----------------------------------------------------
  [-1, 1].forEach((dir) => {
    const lifeboatGeo = new THREE.CapsuleGeometry(0.075, 0.28, 8, 12);
    const lifeboat = new THREE.Mesh(lifeboatGeo, lifeboatMat);
    lifeboat.rotation.z = Math.PI / 2;
    lifeboat.position.set(deckhouseX - 0.15, 1.25, dir * (W / 2 + 0.04));
    ship.add(lifeboat);

    // White Davit arms
    const davitGeo = new THREE.BoxGeometry(0.03, 0.22, 0.08);
    const davitAft = new THREE.Mesh(davitGeo, superstructureMat);
    davitAft.position.set(deckhouseX - 0.28, 1.24, dir * (W / 2 - 0.02));
    ship.add(davitAft);

    const davitFwd = new THREE.Mesh(davitGeo, superstructureMat);
    davitFwd.position.set(deckhouseX - 0.02, 1.24, dir * (W / 2 - 0.02));
    ship.add(davitFwd);
  });

  // ----------------------------------------------------
  // 10. Poop Deck Mooring Equipment (Aft deck behind house)
  // ----------------------------------------------------
  const sternCapstan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.15, 10),
    catwalkMat
  );
  sternCapstan.position.set(-midL / 2 - 1.2, 0.68, 0);
  ship.add(sternCapstan);

  // Stern ensign staff
  const ensignStaff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6),
    superstructureMat
  );
  ensignStaff.position.set(-midL / 2 - 1.6, 0.82, 0);
  ensignStaff.rotation.z = -0.25;
  ship.add(ensignStaff);

  return ship;
}
