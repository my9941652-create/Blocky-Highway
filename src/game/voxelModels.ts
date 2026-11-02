import * as THREE from 'three';
import { VehicleDef } from '../types/game';

// Helper to create a colored box mesh with shadows
export function createBox(
  w: number,
  h: number,
  d: number,
  color: number | string,
  roughness = 0.6,
  metalness = 0.1,
  castShadow = true,
  receiveShadow = true
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

// Wheels container helper
export interface CarWheels {
  fl: THREE.Group;
  fr: THREE.Group;
  rl: THREE.Group;
  rr: THREE.Group;
}

/**
 * Creates a blocky wheel with rim and tire tread
 */
function createWheel(diameter = 0.52, width = 0.3, tireColor = 0x222224, rimColor = 0xd1d5db): THREE.Group {
  const wheelGroup = new THREE.Group();

  // Tire outer block/cylinder
  const tireGeo = new THREE.CylinderGeometry(diameter / 2, diameter / 2, width, 12);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: tireColor,
    roughness: 0.85,
    metalness: 0.1,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  wheelGroup.add(tire);

  // Rim hub
  const rimGeo = new THREE.CylinderGeometry(diameter * 0.32, diameter * 0.32, width + 0.02, 8);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.3,
    metalness: 0.8,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.castShadow = true;
  wheelGroup.add(rim);

  return wheelGroup;
}

/**
 * Builds a Composite 3D Voxel Car based on vehicle definition
 */
export function createCarModel(def: VehicleDef): { group: THREE.Group; wheels: CarWheels; bodyMesh: THREE.Group } {
  const root = new THREE.Group();
  root.name = `car_${def.id}`;

  const body = new THREE.Group();
  root.add(body);

  const primaryCol = parseInt(def.primaryColor.replace('#', '0x'), 16);
  const secondaryCol = parseInt(def.secondaryColor.replace('#', '0x'), 16);
  const roofCol = parseInt(def.roofColor.replace('#', '0x'), 16);
  const glassCol = parseInt(def.glassColor.replace('#', '0x'), 16);
  const accentCol = parseInt(def.accentColor.replace('#', '0x'), 16);

  // Chassis bottom base (dark steel)
  const chassis = createBox(1.5, 0.22, 3.2, 0x1f2937, 0.7, 0.4);
  chassis.position.set(0, 0.32, 0);
  body.add(chassis);

  if (def.type === 'roadster') {
    // 1. Lower Main Body
    const lowerBody = createBox(1.54, 0.46, 3.1, primaryCol, 0.3, 0.3);
    lowerBody.position.set(0, 0.58, 0);
    body.add(lowerBody);

    // Hood scoop / racing stripe
    const stripe = createBox(0.44, 0.04, 3.0, secondaryCol, 0.3, 0.2);
    stripe.position.set(0, 0.82, 0.02);
    body.add(stripe);

    // Cabin / Windshield
    const cabin = createBox(1.3, 0.46, 1.5, glassCol, 0.1, 0.9);
    cabin.position.set(0, 0.95, -0.2);
    body.add(cabin);

    // Roof
    const roof = createBox(1.34, 0.1, 1.35, roofCol, 0.3, 0.3);
    roof.position.set(0, 1.2, -0.22);
    body.add(roof);

    // Front Bumper & Grille
    const frontBumper = createBox(1.58, 0.26, 0.3, 0x111827, 0.8, 0.2);
    frontBumper.position.set(0, 0.45, 1.62);
    body.add(frontBumper);

    const grille = createBox(0.8, 0.16, 0.05, 0x374151, 0.4, 0.6);
    grille.position.set(0, 0.46, 1.78);
    body.add(grille);

    // Rear Spoiler
    const spoilerWing = createBox(1.6, 0.08, 0.35, accentCol, 0.3, 0.5);
    spoilerWing.position.set(0, 1.05, -1.55);
    body.add(spoilerWing);

    const spoilerLeftPost = createBox(0.08, 0.3, 0.08, 0x111827);
    spoilerLeftPost.position.set(-0.55, 0.88, -1.55);
    body.add(spoilerLeftPost);

    const spoilerRightPost = createBox(0.08, 0.3, 0.08, 0x111827);
    spoilerRightPost.position.set(0.55, 0.88, -1.55);
    body.add(spoilerRightPost);
  } else if (def.type === 'truck') {
    // 4x4 Truck: Higher chassis, chunky cab, open cargo bed
    const lowerBody = createBox(1.65, 0.58, 3.4, primaryCol, 0.5, 0.2);
    lowerBody.position.set(0, 0.68, 0);
    body.add(lowerBody);

    // Cab
    const cab = createBox(1.55, 0.65, 1.6, secondaryCol, 0.4, 0.2);
    cab.position.set(0, 1.15, 0.3);
    body.add(cab);

    // Cab Glass
    const glass = createBox(1.58, 0.45, 1.4, glassCol, 0.1, 0.8);
    glass.position.set(0, 1.25, 0.3);
    body.add(glass);

    // Truck Bed Walls
    const bedWallL = createBox(0.12, 0.45, 1.4, primaryCol);
    bedWallL.position.set(-0.72, 1.05, -0.95);
    body.add(bedWallL);

    const bedWallR = createBox(0.12, 0.45, 1.4, primaryCol);
    bedWallR.position.set(0.72, 1.05, -0.95);
    body.add(bedWallR);

    const bedBack = createBox(1.55, 0.45, 0.12, primaryCol);
    bedBack.position.set(0, 1.05, -1.65);
    body.add(bedBack);

    // Roll bar & Roof rack
    const rollBar = createBox(1.5, 0.12, 0.12, 0x111827);
    rollBar.position.set(0, 1.58, -0.45);
    body.add(rollBar);

    // Front Bullbar
    const bullBar = createBox(1.4, 0.4, 0.15, 0x111827, 0.6, 0.6);
    bullBar.position.set(0, 0.55, 1.78);
    body.add(bullBar);
  } else if (def.type === 'police') {
    // Police Interceptor: Cruiser body with roof siren light bar
    const lowerBody = createBox(1.54, 0.52, 3.3, primaryCol, 0.3, 0.3);
    lowerBody.position.set(0, 0.62, 0);
    body.add(lowerBody);

    // White door panel block
    const whitePanelL = createBox(0.04, 0.45, 1.6, 0xffffff, 0.4, 0.1);
    whitePanelL.position.set(-0.78, 0.62, 0);
    body.add(whitePanelL);

    const whitePanelR = createBox(0.04, 0.45, 1.6, 0xffffff, 0.4, 0.1);
    whitePanelR.position.set(0.78, 0.62, 0);
    body.add(whitePanelR);

    // Cabin
    const cabin = createBox(1.36, 0.52, 1.8, glassCol, 0.1, 0.9);
    cabin.position.set(0, 1.05, -0.15);
    body.add(cabin);

    // Roof
    const roof = createBox(1.4, 0.1, 1.6, 0xffffff, 0.3, 0.2);
    roof.position.set(0, 1.34, -0.15);
    body.add(roof);

    // Police Lightbar (Red, White, Blue)
    const sirenBase = createBox(0.8, 0.08, 0.18, 0x111827);
    sirenBase.position.set(0, 1.42, -0.15);
    body.add(sirenBase);

    const sirenRed = createBox(0.32, 0.14, 0.18, 0xef4444, 0.2, 0.8);
    (sirenRed.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xef4444);
    (sirenRed.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
    sirenRed.position.set(-0.25, 1.5, -0.15);
    sirenRed.name = 'siren_red';
    body.add(sirenRed);

    const sirenBlue = createBox(0.32, 0.14, 0.18, 0x3b82f6, 0.2, 0.8);
    (sirenBlue.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x3b82f6);
    (sirenBlue.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
    sirenBlue.position.set(0.25, 1.5, -0.15);
    sirenBlue.name = 'siren_blue';
    body.add(sirenBlue);
  } else {
    // Camper Van: Tall boxy retro style with surf rack
    const lowerBody = createBox(1.6, 0.62, 3.4, primaryCol, 0.4, 0.2);
    lowerBody.position.set(0, 0.68, 0);
    body.add(lowerBody);

    const upperBody = createBox(1.56, 0.68, 3.2, secondaryCol, 0.4, 0.2);
    upperBody.position.set(0, 1.25, -0.05);
    body.add(upperBody);

    // Continuous wrap-around windows
    const sideGlassL = createBox(0.04, 0.36, 2.6, glassCol, 0.1, 0.9);
    sideGlassL.position.set(-0.79, 1.35, -0.1);
    body.add(sideGlassL);

    const sideGlassR = createBox(0.04, 0.36, 2.6, glassCol, 0.1, 0.9);
    sideGlassR.position.set(0.79, 1.35, -0.1);
    body.add(sideGlassR);

    const windshield = createBox(1.5, 0.36, 0.04, glassCol, 0.1, 0.9);
    windshield.position.set(0, 1.35, 1.56);
    body.add(windshield);

    // Roof & Surfboard
    const roof = createBox(1.64, 0.14, 3.3, roofCol, 0.3, 0.2);
    roof.position.set(0, 1.64, -0.05);
    body.add(roof);

    // Surfboard
    const surfboard = createBox(0.48, 0.06, 2.2, 0xf59e0b, 0.4, 0.2);
    surfboard.position.set(0.2, 1.76, -0.1);
    surfboard.rotation.y = 0.05;
    body.add(surfboard);
  }

  // Common Details for all cars:
  // Front Headlights (Bright luminous yellow-white)
  const headLightMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef08a,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });
  const hlGeo = new THREE.BoxGeometry(0.26, 0.16, 0.06);
  const hlLeft = new THREE.Mesh(hlGeo, headLightMat);
  hlLeft.position.set(-0.56, 0.58, 1.6);
  body.add(hlLeft);

  const hlRight = new THREE.Mesh(hlGeo, headLightMat);
  hlRight.position.set(0.56, 0.58, 1.6);
  body.add(hlRight);

  // Rear Taillights (Red)
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });
  const tlGeo = new THREE.BoxGeometry(0.28, 0.14, 0.06);
  const tlLeft = new THREE.Mesh(tlGeo, tailLightMat);
  tlLeft.position.set(-0.56, 0.58, -1.6);
  body.add(tlLeft);

  const tlRight = new THREE.Mesh(tlGeo, tailLightMat);
  tlRight.position.set(0.56, 0.58, -1.6);
  body.add(tlRight);

  // Side mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.18, 0.12, 0.12);
  const mirrorMat = new THREE.MeshStandardMaterial({ color: primaryCol, roughness: 0.4 });
  const ml = new THREE.Mesh(mirrorGeo, mirrorMat);
  ml.position.set(-0.84, 0.88, 0.4);
  body.add(ml);

  const mr = new THREE.Mesh(mirrorGeo, mirrorMat);
  mr.position.set(0.84, 0.88, 0.4);
  body.add(mr);

  // Wheels
  const wheelOffsetZ = 0.95;
  const wheelOffsetX = 0.82;
  const wheelY = 0.28;

  const tireColor = def.type === 'truck' ? 0x18181b : 0x27272a;
  const diameter = def.type === 'truck' ? 0.6 : 0.52;
  const width = def.type === 'truck' ? 0.34 : 0.28;

  const flWheel = createWheel(diameter, width, tireColor, 0xe5e7eb);
  flWheel.position.set(-wheelOffsetX, wheelY, wheelOffsetZ);
  root.add(flWheel);

  const frWheel = createWheel(diameter, width, tireColor, 0xe5e7eb);
  frWheel.position.set(wheelOffsetX, wheelY, wheelOffsetZ);
  root.add(frWheel);

  const rlWheel = createWheel(diameter, width, tireColor, 0xe5e7eb);
  rlWheel.position.set(-wheelOffsetX, wheelY, -wheelOffsetZ);
  root.add(rlWheel);

  const rrWheel = createWheel(diameter, width, tireColor, 0xe5e7eb);
  rrWheel.position.set(wheelOffsetX, wheelY, -wheelOffsetZ);
  root.add(rrWheel);

  return {
    group: root,
    wheels: { fl: flWheel, fr: frWheel, rl: rlWheel, rr: rrWheel },
    bodyMesh: body,
  };
}

/**
 * Creates cartoon traffic vehicles to dodge
 */
export function createTrafficCar(style: 'taxi' | 'sedan' | 'truck'): THREE.Group {
  const root = new THREE.Group();
  root.name = 'traffic_car';

  const color = style === 'taxi' ? 0xfacc15 : style === 'sedan' ? 0x0284c7 : 0x16a34a;

  // Body
  const base = createBox(1.5, 0.48, 3.0, color, 0.4, 0.2);
  base.position.set(0, 0.55, 0);
  root.add(base);

  // Cabin
  const cabin = createBox(1.3, 0.46, 1.6, 0x1e293b, 0.1, 0.8);
  cabin.position.set(0, 0.98, -0.15);
  root.add(cabin);

  // Roof
  const roof = createBox(1.34, 0.08, 1.5, color, 0.4, 0.2);
  roof.position.set(0, 1.25, -0.15);
  root.add(roof);

  if (style === 'taxi') {
    // Taxi roof sign
    const sign = createBox(0.4, 0.16, 0.2, 0xffffff, 0.3, 0.1);
    sign.position.set(0, 1.38, -0.15);
    root.add(sign);
  }

  // Headlights (Facing toward the player when oncoming or away)
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.9 });
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.05), hlMat);
  hl.position.set(-0.52, 0.55, 1.52);
  root.add(hl);
  const hr = hl.clone();
  hr.position.x = 0.52;
  root.add(hr);

  // Taillights
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.9 });
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.05), tlMat);
  tl.position.set(-0.52, 0.55, -1.52);
  root.add(tl);
  const tr = tl.clone();
  tr.position.x = 0.52;
  root.add(tr);

  // Four simple wheels
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
  const wheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.22, 10);
  wheelGeo.rotateZ(Math.PI / 2);

  const pos = [
    [-0.78, 0.26, 0.9],
    [0.78, 0.26, 0.9],
    [-0.78, 0.26, -0.9],
    [0.78, 0.26, -0.9],
  ];
  pos.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, y, z);
    w.castShadow = true;
    root.add(w);
  });

  return root;
}

/**
 * Creates striped wooden road barrier
 */
export function createBarrier(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'barrier';

  // Wooden posts on both sides
  const postL = createBox(0.18, 0.8, 0.18, 0x78350f, 0.8, 0.1);
  postL.position.set(-0.95, 0.4, 0);
  root.add(postL);

  const postR = createBox(0.18, 0.8, 0.18, 0x78350f, 0.8, 0.1);
  postR.position.set(0.95, 0.4, 0);
  root.add(postR);

  // Horizontal striped beam
  const beam1 = createBox(2.2, 0.22, 0.08, 0xf97316, 0.6, 0.1); // Bright orange
  beam1.position.set(0, 0.62, 0);
  root.add(beam1);

  // White stripes on beam
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  [-0.65, -0.2, 0.25, 0.7].forEach((x) => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.1), stripeMat);
    stripe.position.set(x, 0.62, 0);
    root.add(stripe);
  });

  const beam2 = createBox(2.2, 0.18, 0.08, 0xf97316, 0.6, 0.1);
  beam2.position.set(0, 0.32, 0);
  root.add(beam2);

  return root;
}

/**
 * Creates TNT or warning crate
 */
export function createCrate(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'crate';

  const crateBody = createBox(1.2, 1.2, 1.2, 0xca8a04, 0.85, 0.05);
  crateBody.position.set(0, 0.6, 0);
  root.add(crateBody);

  // Red danger stripe around middle
  const dangerBand = createBox(1.24, 0.38, 1.24, 0xdc2626, 0.6, 0.1);
  dangerBand.position.set(0, 0.6, 0);
  root.add(dangerBand);

  // Corner metal brackets
  const cornerMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.5, metalness: 0.6 });
  [-0.6, 0.6].forEach((x) => {
    [-0.6, 0.6].forEach((z) => {
      const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.22, 0.12), cornerMat);
      bolt.position.set(x, 0.6, z);
      root.add(bolt);
    });
  });

  return root;
}

/**
 * Creates voxel rock boulder
 */
export function createRock(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'rock';

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, metalness: 0.1 });
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.1), rockMat);
  b1.position.set(0, 0.4, 0);
  b1.rotation.y = 0.3;
  b1.castShadow = true;
  root.add(b1);

  const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.85), rockMat);
  b2.position.set(0.3, 0.7, -0.15);
  b2.rotation.y = -0.4;
  b2.castShadow = true;
  root.add(b2);

  const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), rockMat);
  b3.position.set(-0.4, 0.3, 0.3);
  b3.castShadow = true;
  root.add(b3);

  return root;
}

/**
 * Creates golden rotating coin
 */
export function createCoin(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'coin';

  // Thick octagonal / cylinder gold coin
  const coinGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.12, 12);
  coinGeo.rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24, // Bright gold
    emissive: 0xd97706,
    emissiveIntensity: 0.3,
    roughness: 0.25,
    metalness: 0.85,
  });
  const coinMesh = new THREE.Mesh(coinGeo, coinMat);
  coinMesh.castShadow = true;
  root.add(coinMesh);

  // Star / diamond center emboss
  const starGeo = new THREE.BoxGeometry(0.24, 0.24, 0.16);
  starGeo.rotateZ(Math.PI / 4);
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.9,
  });
  const starMesh = new THREE.Mesh(starGeo, starMat);
  root.add(starMesh);

  return root;
}

/**
 * Creates power-up collectible (Magnet or Nitro)
 */
export function createPowerUp(type: 'magnet' | 'nitro'): THREE.Group {
  const root = new THREE.Group();
  root.name = `powerup_${type}`;

  if (type === 'magnet') {
    // Horseshoe magnet
    const magnetCol = 0xef4444; // Red
    const tipCol = 0xe2e8f0; // Silver tips

    const baseArch = createBox(0.8, 0.22, 0.22, magnetCol, 0.3, 0.4);
    baseArch.position.set(0, 0.5, 0);
    root.add(baseArch);

    const legL = createBox(0.22, 0.5, 0.22, magnetCol, 0.3, 0.4);
    legL.position.set(-0.29, 0.2, 0);
    root.add(legL);

    const legR = createBox(0.22, 0.5, 0.22, magnetCol, 0.3, 0.4);
    legR.position.set(0.29, 0.2, 0);
    root.add(legR);

    const tipL = createBox(0.24, 0.16, 0.24, tipCol, 0.2, 0.8);
    tipL.position.set(-0.29, -0.06, 0);
    root.add(tipL);

    const tipR = createBox(0.24, 0.16, 0.24, tipCol, 0.2, 0.8);
    tipR.position.set(0.29, -0.06, 0);
    root.add(tipR);
  } else {
    // Nitro canister
    const canBody = createBox(0.44, 0.9, 0.44, 0x06b6d4, 0.2, 0.8);
    (canBody.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x06b6d4);
    (canBody.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
    root.add(canBody);

    const valve = createBox(0.22, 0.2, 0.22, 0xf1f5f9, 0.2, 0.9);
    valve.position.set(0, 0.54, 0);
    root.add(valve);

    const band = createBox(0.48, 0.15, 0.48, 0xfacc15, 0.3, 0.5);
    root.add(band);
  }

  return root;
}

/**
 * Creates Blocky Pine Tree
 */
export function createVoxelPineTree(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'pine_tree';

  // Brown trunk
  const trunk = createBox(0.6, 1.4, 0.6, 0x78350f, 0.9, 0.1);
  trunk.position.set(0, 0.7, 0);
  root.add(trunk);

  // Layered green pine foliage boxes
  const leafColor = 0x15803d;
  const l1 = createBox(2.8, 1.0, 2.8, leafColor, 0.85, 0.05);
  l1.position.set(0, 1.8, 0);
  root.add(l1);

  const l2 = createBox(2.2, 1.0, 2.2, 0x16a34a, 0.85, 0.05);
  l2.position.set(0, 2.6, 0);
  root.add(l2);

  const l3 = createBox(1.5, 0.9, 1.5, 0x22c55e, 0.85, 0.05);
  l3.position.set(0, 3.4, 0);
  root.add(l3);

  const l4 = createBox(0.8, 0.7, 0.8, 0x4ade80, 0.85, 0.05);
  l4.position.set(0, 4.0, 0);
  root.add(l4);

  return root;
}

/**
 * Creates Blocky Oak Tree with leafy foliage
 */
export function createVoxelOakTree(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'oak_tree';

  // Trunk
  const trunk = createBox(0.7, 1.8, 0.7, 0x854d0e, 0.9, 0.1);
  trunk.position.set(0, 0.9, 0);
  root.add(trunk);

  // Leafy crown
  const leafCol = 0x16a34a;
  const centerLeaves = createBox(2.4, 2.0, 2.4, leafCol, 0.85, 0.05);
  centerLeaves.position.set(0, 2.6, 0);
  root.add(centerLeaves);

  const side1 = createBox(1.5, 1.4, 1.5, 0x15803d, 0.85, 0.05);
  side1.position.set(0.9, 2.3, 0.4);
  root.add(side1);

  const side2 = createBox(1.4, 1.3, 1.4, 0x22c55e, 0.85, 0.05);
  side2.position.set(-0.8, 2.4, -0.5);
  root.add(side2);

  return root;
}

/**
 * Creates cute blocky roadside house
 */
export function createVoxelHouse(roofHue = 0xd97706): THREE.Group {
  const root = new THREE.Group();
  root.name = 'house';

  // House base / walls
  const walls = createBox(3.4, 2.4, 3.4, 0xfef08a, 0.8, 0.1);
  walls.position.set(0, 1.2, 0);
  root.add(walls);

  // Pitched blocky roof layers
  const r1 = createBox(3.8, 0.5, 3.8, roofHue, 0.7, 0.1);
  r1.position.set(0, 2.6, 0);
  root.add(r1);

  const r2 = createBox(2.8, 0.5, 2.8, roofHue, 0.7, 0.1);
  r2.position.set(0, 3.1, 0);
  root.add(r2);

  const r3 = createBox(1.6, 0.5, 1.6, roofHue, 0.7, 0.1);
  r3.position.set(0, 3.6, 0);
  root.add(r3);

  // Chimney
  const chimney = createBox(0.6, 1.2, 0.6, 0xb91c1c, 0.8, 0.1);
  chimney.position.set(0.9, 3.8, -0.6);
  root.add(chimney);

  // Door
  const door = createBox(0.8, 1.2, 0.1, 0x78350f, 0.8, 0.1);
  door.position.set(0, 0.6, 1.72);
  root.add(door);

  // Window with warm glow
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    emissive: 0xfef08a,
    emissiveIntensity: 0.6,
  });
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1), windowMat);
  win.position.set(1.0, 1.4, 1.72);
  root.add(win);

  return root;
}

/**
 * Creates a roadside streetlamp with glowing lantern
 */
export function createVoxelStreetlamp(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'streetlamp';

  // Dark iron pole
  const pole = createBox(0.18, 3.6, 0.18, 0x1f2937, 0.5, 0.5);
  pole.position.set(0, 1.8, 0);
  root.add(pole);

  // Arm
  const arm = createBox(0.9, 0.16, 0.16, 0x1f2937, 0.5, 0.5);
  arm.position.set(0.35, 3.5, 0);
  root.add(arm);

  // Lantern
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 1.5,
  });
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), lanternMat);
  lantern.position.set(0.75, 3.25, 0);
  root.add(lantern);

  return root;
}

/**
 * Creates a fluffy voxel cloud
 */
export function createVoxelCloud(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'cloud';

  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
  });

  const c1 = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.5, 3.5), cloudMat);
  root.add(c1);

  const c2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 2.8), cloudMat);
  c2.position.set(0.8, 0.5, 0.2);
  root.add(c2);

  const c3 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 2.2), cloudMat);
  c3.position.set(-1.4, 0.3, -0.4);
  root.add(c3);

  return root;
}

/**
 * Creates distant blocky mountain
 */
export function createVoxelMountain(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'mountain';

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });

  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(28, 14, 28), rockMat);
  base.position.set(0, 7, 0);
  root.add(base);

  // Mid
  const mid = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), rockMat);
  mid.position.set(0, 18, 0);
  root.add(mid);

  // Peak
  const peak = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 12), rockMat);
  peak.position.set(0, 27, 0);
  root.add(peak);

  // Snow cap
  const snow = new THREE.Mesh(new THREE.BoxGeometry(12.2, 4.5, 12.2), snowMat);
  snow.position.set(0, 30, 0);
  root.add(snow);

  return root;
}
