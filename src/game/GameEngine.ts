import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VehicleDef, LaneIndex, LANE_WIDTH, ObstacleObject, CoinObject, PowerUpObject, GameStats } from '../types/game';
import { VEHICLE_PRESETS } from './vehiclePresets';
import {
  createCarModel,
  createTrafficCar,
  createBarrier,
  createCrate,
  createRock,
  createCoin,
  createPowerUp,
  createVoxelPineTree,
  createVoxelOakTree,
  createVoxelHouse,
  createVoxelStreetlamp,
  createVoxelCloud,
  createVoxelMountain,
  CarWheels,
} from './voxelModels';
import { soundManager } from '../audio/soundManager';

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  rotSpeed: number;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean = false;

  // Animation frame id & clock
  private frameId: number = 0;
  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Game state
  private selectedVehicleDef: VehicleDef = VEHICLE_PRESETS[0];
  private playerGroup: THREE.Group | null = null;
  private playerBodyMesh: THREE.Group | null = null;
  private playerWheels: CarWheels | null = null;

  // Player state
  private currentLane: LaneIndex = 0;
  private targetLaneX: number = 0;
  private playerX: number = 0;
  private playerY: number = 0;
  private playerVelocityY: number = 0;
  private isJumping: boolean = false;
  private landingSquash: number = 1.0;
  private rollAngle: number = 0;

  // Speed and distance
  private baseSpeed: number = 32.0; // units/sec
  private currentSpeed: number = 32.0;
  private maxSpeed: number = 68.0;
  private distanceTraveled: number = 0;
  private coinsCount: number = 0;
  private nitroTimer: number = 0;
  private magnetTimer: number = 0;
  private isGameOver: boolean = false;
  private hitStopTimer: number = 0;

  // Road chunks
  private roadChunks: THREE.Group[] = [];
  private readonly CHUNK_LENGTH: number = 36;
  private readonly NUM_CHUNKS: number = 9;

  // Active game entities
  private obstacles: ObstacleObject[] = [];
  private coins: CoinObject[] = [];
  private powerUps: PowerUpObject[] = [];
  private sceneryObjects: THREE.Group[] = [];
  private clouds: THREE.Group[] = [];
  private particles: Particle[] = [];

  // Spawning intervals
  private nextSpawnDistance: number = 25;
  private nextPowerUpDistance: number = 180;
  private obstacleIdCounter: number = 0;

  // Camera shake
  private cameraShakeIntensity: number = 0;
  private baseCameraPos = new THREE.Vector3(0, 3.8, 7.5);
  private baseCameraLookAt = new THREE.Vector3(0, 1.2, -6.0);

  // Callbacks
  public onStatsUpdate?: (stats: GameStats) => void;
  public onGameOver?: (finalStats: GameStats) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene setup
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x7dd3fc); // Light sunny blue
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(0x7dd3fc, 55, 175);

    // 2. Camera setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(56, width / height, 0.5, 300);
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(this.baseCameraLookAt);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Studio Environment
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Fallback
    }

    // 5. Lighting
    this.setupLighting();

    // 6. Build Initial World Chunks & Scenery
    this.initRoadChunks();
    this.initDistantMountains();
    this.initClouds();

    // 7. Build Player Car
    this.initPlayerCar(this.selectedVehicleDef);

    // 8. Clock & Event Listeners
    this.clock = new THREE.Clock();
    window.addEventListener('resize', this.handleResize);

    // Pre-warm shaders
    if (!this.isSoftwareGl) {
      try {
        this.renderer.compile(this.scene, this.camera);
      } catch {
        // Ignored
      }
    }

    // Start idle/showcase render loop
    this.startLoop();
  }

  private setupLighting(): void {
    // Warm Key Light (Sun)
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    sunLight.position.set(25, 45, 20);
    sunLight.castShadow = !this.isSoftwareGl;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 120;
      const d = 26;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0004;
      sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(sunLight);

    // Hemisphere Light (Sky & Grass bounce)
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x4ade80, 0.85);
    this.scene.add(hemiLight);

    // Soft Ambient fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);
  }

  /**
   * Initializes repeatable modular road chunks with curbs, dashed stripes, and green verges
   */
  private initRoadChunks(): void {
    const chunkHalf = this.CHUNK_LENGTH / 2;

    for (let i = 0; i < this.NUM_CHUNKS; i++) {
      const chunkGroup = new THREE.Group();
      // Place chunks extending from z = +15 back to -270
      chunkGroup.position.z = 15 - i * this.CHUNK_LENGTH;

      // 1. Main Asphalt Surface (Width = 3 lanes * 2.6 + 0.6 = 8.4)
      const roadGeo = new THREE.PlaneGeometry(8.6, this.CHUNK_LENGTH);
      roadGeo.rotateX(-Math.PI / 2);
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0x27272a, // Dark tarmac
        roughness: 0.85,
        metalness: 0.1,
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.receiveShadow = true;
      chunkGroup.add(road);

      // 2. White Lane Divider Dashes (between Left-Center and Center-Right)
      const dashGeo = new THREE.PlaneGeometry(0.24, 2.6);
      dashGeo.rotateX(-Math.PI / 2);
      const dashMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
      });
      dashMat.polygonOffset = true;
      dashMat.polygonOffsetFactor = -1;
      dashMat.polygonOffsetUnits = -1;

      const numDashes = Math.floor(this.CHUNK_LENGTH / 5.2);
      for (let d = 0; d < numDashes; d++) {
        const zPos = -chunkHalf + (d + 0.5) * 5.2;

        // Line between Left (-2.6) and Center (0) -> x = -1.3
        const dashL = new THREE.Mesh(dashGeo, dashMat);
        dashL.position.set(-1.3, 0.015, zPos);
        chunkGroup.add(dashL);

        // Line between Center (0) and Right (+2.6) -> x = +1.3
        const dashR = new THREE.Mesh(dashGeo, dashMat);
        dashR.position.set(1.3, 0.015, zPos);
        chunkGroup.add(dashR);
      }

      // 3. Side Curbs (Yellow/Red blocky curb markers)
      const curbGeo = new THREE.BoxGeometry(0.35, 0.22, this.CHUNK_LENGTH);
      const curbMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
      const curbL = new THREE.Mesh(curbGeo, curbMat);
      curbL.position.set(-4.45, 0.1, 0);
      curbL.castShadow = true;
      curbL.receiveShadow = true;
      chunkGroup.add(curbL);

      const curbR = new THREE.Mesh(curbGeo, curbMat);
      curbR.position.set(4.45, 0.1, 0);
      curbR.castShadow = true;
      curbR.receiveShadow = true;
      chunkGroup.add(curbR);

      // 4. Expansive Grass Field Verges (Left & Right)
      const grassGeo = new THREE.PlaneGeometry(36, this.CHUNK_LENGTH);
      grassGeo.rotateX(-Math.PI / 2);
      const grassMat = new THREE.MeshStandardMaterial({
        color: 0x4ade80, // Vibrant voxel green grass
        roughness: 0.9,
      });

      const grassL = new THREE.Mesh(grassGeo, grassMat);
      grassL.position.set(-22.6, -0.02, 0);
      grassL.receiveShadow = true;
      chunkGroup.add(grassL);

      const grassR = new THREE.Mesh(grassGeo, grassMat);
      grassR.position.set(22.6, -0.02, 0);
      grassR.receiveShadow = true;
      chunkGroup.add(grassR);

      // 5. Roadside Scenery on this chunk (Trees, houses, lamps)
      this.populateChunkScenery(chunkGroup, i > 1);

      this.scene.add(chunkGroup);
      this.roadChunks.push(chunkGroup);
    }
  }

  /**
   * Adds decorative roadside voxel scenery to a road chunk
   */
  private populateChunkScenery(chunk: THREE.Group, allowHouses: boolean): void {
    const chunkLength = this.CHUNK_LENGTH;
    const itemsPerSide = 3;

    // Left side decorations
    for (let k = 0; k < itemsPerSide; k++) {
      const z = -chunkLength / 2 + (k + 0.5) * (chunkLength / itemsPerSide) + (Math.random() - 0.5) * 3;
      const x = -7.5 - Math.random() * 8;

      const pick = Math.random();
      let prop: THREE.Group;
      if (allowHouses && pick > 0.8) {
        prop = createVoxelHouse(pick > 0.9 ? 0xd97706 : 0xb91c1c);
        prop.position.set(x - 2, 0, z);
        prop.rotation.y = Math.PI / 2;
      } else if (pick > 0.4) {
        prop = createVoxelPineTree();
        const s = 0.85 + Math.random() * 0.35;
        prop.scale.set(s, s, s);
        prop.position.set(x, 0, z);
        prop.rotation.y = Math.random() * Math.PI * 2;
      } else {
        prop = createVoxelOakTree();
        const s = 0.85 + Math.random() * 0.3;
        prop.scale.set(s, s, s);
        prop.position.set(x, 0, z);
        prop.rotation.y = Math.random() * Math.PI * 2;
      }
      chunk.add(prop);
    }

    // Right side decorations
    for (let k = 0; k < itemsPerSide; k++) {
      const z = -chunkLength / 2 + (k + 0.5) * (chunkLength / itemsPerSide) + (Math.random() - 0.5) * 3;
      const x = 7.5 + Math.random() * 8;

      const pick = Math.random();
      let prop: THREE.Group;
      if (allowHouses && pick > 0.82) {
        prop = createVoxelHouse(0x0284c7);
        prop.position.set(x + 2, 0, z);
        prop.rotation.y = -Math.PI / 2;
      } else if (pick > 0.45) {
        prop = createVoxelPineTree();
        const s = 0.85 + Math.random() * 0.35;
        prop.scale.set(s, s, s);
        prop.position.set(x, 0, z);
        prop.rotation.y = Math.random() * Math.PI * 2;
      } else {
        prop = createVoxelStreetlamp();
        prop.position.set(5.2, 0, z);
        prop.rotation.y = Math.PI;
      }
      chunk.add(prop);
    }
  }

  private initDistantMountains(): void {
    const mountainConfigs = [
      { x: -55, z: -140, scale: 1.4 },
      { x: -75, z: -200, scale: 2.0 },
      { x: 55, z: -160, scale: 1.5 },
      { x: 80, z: -210, scale: 2.2 },
      { x: -30, z: -250, scale: 2.5 },
      { x: 40, z: -260, scale: 2.3 },
    ];

    mountainConfigs.forEach((cfg) => {
      const m = createVoxelMountain();
      m.scale.set(cfg.scale, cfg.scale, cfg.scale);
      m.position.set(cfg.x, -2, cfg.z);
      this.scene.add(m);
      this.sceneryObjects.push(m);
    });
  }

  private initClouds(): void {
    for (let i = 0; i < 14; i++) {
      const cloud = createVoxelCloud();
      const s = 1.0 + Math.random() * 1.5;
      cloud.scale.set(s, s, s);
      cloud.position.set(
        (Math.random() - 0.5) * 160,
        22 + Math.random() * 14,
        -Math.random() * 220
      );
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  /**
   * Builds or swaps the active player car model
   */
  public initPlayerCar(def: VehicleDef): void {
    if (this.playerGroup) {
      this.scene.remove(this.playerGroup);
    }
    this.selectedVehicleDef = def;

    const { group, wheels, bodyMesh } = createCarModel(def);
    this.playerGroup = group;
    this.playerWheels = wheels;
    this.playerBodyMesh = bodyMesh;

    this.playerGroup.position.set(this.playerX, this.playerY, 0);
    this.scene.add(this.playerGroup);
  }

  public setVehicle(def: VehicleDef): void {
    this.initPlayerCar(def);
  }

  public resetPlayerCarState(): void {
    this.playerX = 0;
    this.playerY = 0;
    this.playerVelocityY = 0;
    this.targetLaneX = 0;
    this.currentLane = 0;
    this.isJumping = false;
    this.landingSquash = 1.0;
    this.rollAngle = 0;
    this.nitroTimer = 0;
    this.magnetTimer = 0;
    this.cameraShakeIntensity = 0;
    this.hitStopTimer = 0;
    this.isGameOver = false;

    if (!this.playerGroup || !this.scene.children.includes(this.playerGroup)) {
      this.initPlayerCar(this.selectedVehicleDef);
    } else {
      this.playerGroup.position.set(0, 0, 0);
      this.playerGroup.rotation.set(0, 0, 0);
      this.playerGroup.scale.set(1, 1, 1);
      this.playerGroup.visible = true;
      this.playerGroup.traverse((child) => {
        child.visible = true;
      });

      if (this.playerWheels) {
        this.playerWheels.fl.rotation.set(0, 0, 0);
        this.playerWheels.fr.rotation.set(0, 0, 0);
        this.playerWheels.rl.rotation.set(0, 0, 0);
        this.playerWheels.rr.rotation.set(0, 0, 0);
      }
    }

    // Reset camera to default view
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(this.baseCameraLookAt);
  }

  public resetRoadChunks(): void {
    for (let i = 0; i < this.roadChunks.length; i++) {
      this.roadChunks[i].position.z = 15 - i * this.CHUNK_LENGTH;
    }
  }

  public startGame(): void {
    this.isGameOver = false;
    this.isPaused = false;
    this.isRunning = true;
    this.distanceTraveled = 0;
    this.coinsCount = 0;
    this.currentSpeed = this.baseSpeed * (this.selectedVehicleDef.speedBonus || 1.0);
    this.nextSpawnDistance = 25;
    this.nextPowerUpDistance = 150;

    // Reset player car & scene elements completely
    this.resetPlayerCarState();
    this.clearDynamicObjects();
    this.resetRoadChunks();

    // Audio
    soundManager.startEngine();
    soundManager.startMusic();
  }

  public pauseGame(): void {
    this.isPaused = true;
    soundManager.stopEngine();
    soundManager.stopMusic();
  }

  public resumeGame(): void {
    this.isPaused = false;
    this.clock.getDelta(); // flush delta time after pause
    if (this.playerGroup) {
      this.playerGroup.visible = true;
      this.playerGroup.position.z = 0;
      this.playerGroup.rotation.x = 0;
    }
    soundManager.startEngine();
    soundManager.startMusic();
  }

  public restartGame(): void {
    this.startGame();
  }

  public returnToTitle(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.clearDynamicObjects();
    this.resetPlayerCarState();
    this.resetRoadChunks();
    soundManager.stopEngine();
    soundManager.stopMusic();
  }

  public moveLeft(): void {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    if (this.currentLane > -1) {
      this.currentLane = (this.currentLane - 1) as LaneIndex;
      this.targetLaneX = this.currentLane * LANE_WIDTH;
      soundManager.playLaneSwitch();
      this.emitDust(4);
    }
  }

  public moveRight(): void {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    if (this.currentLane < 1) {
      this.currentLane = (this.currentLane + 1) as LaneIndex;
      this.targetLaneX = this.currentLane * LANE_WIDTH;
      soundManager.playLaneSwitch();
      this.emitDust(4);
    }
  }

  public jump(): void {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    if (!this.isJumping && this.playerY <= 0.05) {
      this.isJumping = true;
      this.playerVelocityY = 11.5;
      soundManager.playJump();
      this.emitDust(6);
    }
  }

  private clearDynamicObjects(): void {
    this.obstacles.forEach((obs) => this.scene.remove(obs.mesh));
    this.obstacles = [];

    this.coins.forEach((c) => this.scene.remove(c.mesh));
    this.coins = [];

    this.powerUps.forEach((p) => this.scene.remove(p.mesh));
    this.powerUps = [];

    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];
  }

  /**
   * Main simulation tick
   */
  private update(rawDt: number): void {
    // Clamp frame delta time for simulation stability
    const dt = Math.min(rawDt, 0.05);

    // Hit-stop effect on heavy crash
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return;
    }

    // In Title / Idle mode: showcase car gentle float & scenery slowly scrolls
    if (!this.isRunning) {
      this.updateTitleShowcase(dt);
      return;
    }

    if (this.isPaused) return;

    if (this.isGameOver) {
      this.updateGameOverCrash(dt);
      return;
    }

    // Active gameplay simulation
    // 1. Timers
    if (this.nitroTimer > 0) {
      this.nitroTimer -= dt;
    }
    if (this.magnetTimer > 0) {
      this.magnetTimer -= dt;
    }

    // 2. Speed calculation
    const baseTarget = this.baseSpeed + Math.min(this.distanceTraveled * 0.016, 26);
    const targetSpeed = this.nitroTimer > 0 ? baseTarget * 1.55 : baseTarget;
    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, targetSpeed, 4, dt);

    const stepDistance = this.currentSpeed * dt;
    this.distanceTraveled += stepDistance;

    // Update sound engine pitch
    const speedRatio = (this.currentSpeed - this.baseSpeed) / (this.maxSpeed - this.baseSpeed);
    soundManager.updateEnginePitch(Math.min(1.0, Math.max(0, speedRatio)));

    // 3. Move road chunks towards camera (+Z)
    this.updateRoadChunks(stepDistance);

    // 4. Update player kinematics
    this.updatePlayerKinematics(dt);

    // 5. Update and spawn obstacles & rewards
    this.updateSpawns(stepDistance);
    this.updateObstacles(stepDistance, dt);
    this.updateCoins(stepDistance, dt);
    this.updatePowerUps(stepDistance, dt);

    // 6. Check collisions
    this.checkCollisions();

    // 7. Update clouds & distant scenery
    this.updateClouds(dt);

    // 8. Update particle physics
    this.updateParticles(dt);

    // 9. Camera following & shake
    this.updateCamera(dt);

    // 10. Emit stats callback
    if (this.onStatsUpdate) {
      const highScore = parseInt(localStorage.getItem('blocky_car_highscore') || '0', 10);
      this.onStatsUpdate({
        distance: Math.floor(this.distanceTraveled),
        coins: this.coinsCount,
        speed: Math.floor(this.currentSpeed * 2.8), // km/h representation
        score: Math.floor(this.distanceTraveled + this.coinsCount * 25),
        highScore,
        multiplier: this.nitroTimer > 0 ? 2 : 1,
        nitroTime: Math.max(0, this.nitroTimer),
        magnetTime: Math.max(0, this.magnetTimer),
      });
    }
  }

  private updateTitleShowcase(dt: number): void {
    // Road slowly scrolls for a dynamic live showcase
    this.updateRoadChunks(8.0 * dt);
    this.updateClouds(dt);

    if (this.playerGroup) {
      const t = this.clock.getElapsedTime();
      this.playerGroup.position.set(Math.sin(t * 1.2) * 1.2, 0, 0);
      this.playerGroup.rotation.set(0, Math.sin(t * 1.2) * 0.12, -Math.sin(t * 1.2) * 0.05);
      this.playerGroup.scale.set(1, 1, 1);
      this.playerGroup.visible = true;

      if (this.playerWheels) {
        const spin = 10 * dt;
        this.playerWheels.fl.rotation.x += spin;
        this.playerWheels.fr.rotation.x += spin;
        this.playerWheels.rl.rotation.x += spin;
        this.playerWheels.rr.rotation.x += spin;
      }
    }
  }

  private updateRoadChunks(stepDistance: number): void {
    const chunkLength = this.CHUNK_LENGTH;
    const totalLength = this.NUM_CHUNKS * chunkLength;

    for (const chunk of this.roadChunks) {
      chunk.position.z += stepDistance;

      // When chunk moves past behind the camera (z > 22), loop it to the front
      if (chunk.position.z > 22) {
        chunk.position.z -= totalLength;
      }
    }
  }

  private updatePlayerKinematics(dt: number): void {
    if (!this.playerGroup) return;

    // Smooth horizontal lane transition with spring damping
    const handling = this.selectedVehicleDef.handling || 1.0;
    this.playerX = THREE.MathUtils.damp(this.playerX, this.targetLaneX, 15 * handling, dt);

    // Roll tilt into the turn
    const dx = this.targetLaneX - this.playerX;
    const targetRoll = -dx * 0.14;
    this.rollAngle = THREE.MathUtils.damp(this.rollAngle, targetRoll, 16, dt);

    // Jump vertical physics
    if (this.isJumping) {
      this.playerVelocityY -= 32 * dt; // Gravity
      this.playerY += this.playerVelocityY * dt;

      if (this.playerY <= 0) {
        this.playerY = 0;
        this.playerVelocityY = 0;
        this.isJumping = false;
        this.landingSquash = 0.82; // Squash on impact
        this.emitDust(8);
      }
    } else {
      // Suspension bounce while driving
      const bounce = Math.sin(this.distanceTraveled * 0.9) * 0.022;
      this.playerY = bounce;
    }

    // Squash & stretch recovery
    this.landingSquash = THREE.MathUtils.damp(this.landingSquash, 1.0, 14, dt);

    // Apply transforms to playerGroup - always enforce Z = 0 and visible
    this.playerGroup.position.set(this.playerX, this.playerY, 0);
    this.playerGroup.rotation.set(0, dx * 0.08, this.rollAngle);
    this.playerGroup.visible = true;

    // Scale squash on landing
    this.playerGroup.scale.set(1 / Math.sqrt(this.landingSquash), this.landingSquash, 1 / Math.sqrt(this.landingSquash));

    // Wheel rotation
    if (this.playerWheels) {
      const wheelSpin = (this.currentSpeed * dt) / 0.28;
      this.playerWheels.fl.rotation.x += wheelSpin;
      this.playerWheels.fr.rotation.x += wheelSpin;
      this.playerWheels.rl.rotation.x += wheelSpin;
      this.playerWheels.rr.rotation.x += wheelSpin;

      // Front wheels steer into lane change
      const steerAngle = -dx * 0.25;
      this.playerWheels.fl.rotation.y = steerAngle;
      this.playerWheels.fr.rotation.y = steerAngle;
    }

    // Animated flashing police sirens
    if (this.selectedVehicleDef.type === 'police' && this.playerBodyMesh) {
      const t = this.clock.getElapsedTime();
      const sirenRed = this.playerBodyMesh.getObjectByName('siren_red') as THREE.Mesh | undefined;
      const sirenBlue = this.playerBodyMesh.getObjectByName('siren_blue') as THREE.Mesh | undefined;
      if (sirenRed && sirenBlue) {
        const flash = Math.sin(t * 18) > 0;
        (sirenRed.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 2.5 : 0.2;
        (sirenBlue.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 0.2 : 2.5;
      }
    }

    // Emit light dust puffs periodically when moving on ground
    if (Math.random() < 0.25 && !this.isJumping) {
      this.emitDust(1);
    }
  }

  private updateSpawns(stepDistance: number): void {
    this.nextSpawnDistance -= stepDistance;
    if (this.nextSpawnDistance <= 0) {
      this.spawnObstacleWave();
      // Wave spacing decreases with speed for progressive challenge
      this.nextSpawnDistance = Math.max(16, 26 - this.distanceTraveled * 0.0035);
    }

    this.nextPowerUpDistance -= stepDistance;
    if (this.nextPowerUpDistance <= 0) {
      this.spawnPowerUp();
      this.nextPowerUpDistance = 140 + Math.random() * 80;
    }
  }

  /**
   * Spawns an obstacle pattern ensuring at least 1 lane is safe to traverse
   */
  private spawnObstacleWave(): void {
    const spawnZ = -140; // Spawn well ahead of camera
    const lanes: LaneIndex[] = [-1, 0, 1];

    // Pick 1 lane to ALWAYS guarantee free/safe passage (or jumpable)
    const safeLaneIdx = Math.floor(Math.random() * 3);
    const safeLane = lanes[safeLaneIdx];
    const hazardLanes = lanes.filter((l) => l !== safeLane);

    // Number of obstacles: 1 or 2
    const numObstacles = Math.random() > 0.45 && this.distanceTraveled > 80 ? 2 : 1;

    for (let i = 0; i < numObstacles; i++) {
      const lane = hazardLanes[i];
      const r = Math.random();

      let obsMesh: THREE.Group;
      let type: ObstacleObject['type'] = 'barrier';
      let w = 2.0;
      let h = 1.0;
      let d = 1.0;
      let speed = 0;

      if (r < 0.35) {
        // Striped Barrier (Can jump over!)
        type = 'barrier';
        obsMesh = createBarrier();
        w = 2.2;
        h = 0.9;
        d = 0.5;
      } else if (r < 0.6) {
        // Traffic car moving slowly
        type = 'traffic';
        const styles: ('taxi' | 'sedan' | 'truck')[] = ['taxi', 'sedan', 'truck'];
        obsMesh = createTrafficCar(styles[Math.floor(Math.random() * styles.length)]);
        w = 1.6;
        h = 1.4;
        d = 3.0;
        speed = this.baseSpeed * (0.35 + Math.random() * 0.25);
      } else if (r < 0.8) {
        // Boulder rock
        type = 'rock';
        obsMesh = createRock();
        w = 1.6;
        h = 1.2;
        d = 1.4;
      } else {
        // Caution Crate
        type = 'crate';
        obsMesh = createCrate();
        w = 1.3;
        h = 1.3;
        d = 1.3;
      }

      obsMesh.position.set(lane * LANE_WIDTH, 0, spawnZ);
      this.scene.add(obsMesh);

      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        type,
        lane,
        z: spawnZ,
        width: w,
        height: h,
        depth: d,
        speed,
        mesh: obsMesh,
      });
    }

    // Spawn coins: either in safe lane or in arc over barrier
    const spawnCoins = Math.random() > 0.2;
    if (spawnCoins) {
      const coinLane = Math.random() > 0.5 ? safeLane : lanes[Math.floor(Math.random() * 3)];
      const numCoins = 3 + Math.floor(Math.random() * 4);
      for (let c = 0; c < numCoins; c++) {
        const coinMesh = createCoin();
        const zOffset = spawnZ + (c - numCoins / 2) * 3.5;
        const yOffset = 0.6; // Ground height

        coinMesh.position.set(coinLane * LANE_WIDTH, yOffset, zOffset);
        this.scene.add(coinMesh);

        this.coins.push({
          id: ++this.obstacleIdCounter,
          lane: coinLane,
          z: zOffset,
          y: yOffset,
          mesh: coinMesh,
        });
      }
    }
  }

  private spawnPowerUp(): void {
    const lanes: LaneIndex[] = [-1, 0, 1];
    const lane = lanes[Math.floor(Math.random() * 3)];
    const type: 'magnet' | 'nitro' = Math.random() > 0.5 ? 'nitro' : 'magnet';
    const mesh = createPowerUp(type);
    const z = -150;
    const y = 0.8;

    mesh.position.set(lane * LANE_WIDTH, y, z);
    this.scene.add(mesh);

    this.powerUps.push({
      id: ++this.obstacleIdCounter,
      type,
      lane,
      z,
      y,
      mesh,
    });
  }

  private updateObstacles(stepDistance: number, dt: number): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      // Relative movement: road speed + obstacle speed
      const deltaZ = stepDistance - (obs.speed ? obs.speed * dt : 0);
      obs.z += deltaZ;
      obs.mesh.position.z = obs.z;

      // Despawn when far behind player
      if (obs.z > 20) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateCoins(stepDistance: number, dt: number): void {
    const isMagnetActive = this.magnetTimer > 0;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.z += stepDistance;

      // Continuous golden coin rotation
      c.mesh.rotation.y += 3.8 * dt;

      // Magnet attraction towards player
      if (isMagnetActive && c.z > -28 && c.z < 10) {
        c.mesh.position.x = THREE.MathUtils.damp(c.mesh.position.x, this.playerX, 10, dt);
        c.mesh.position.y = THREE.MathUtils.damp(c.mesh.position.y, this.playerY + 0.6, 10, dt);
        c.z += 12 * dt; // Pull faster towards car
      }

      c.mesh.position.z = c.z;

      // Despawn
      if (c.z > 15) {
        this.scene.remove(c.mesh);
        this.coins.splice(i, 1);
      }
    }
  }

  private updatePowerUps(stepDistance: number, dt: number): void {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.z += stepDistance;
      p.mesh.rotation.y += 3.0 * dt;
      p.mesh.position.y = p.y + Math.sin(this.clock.getElapsedTime() * 4) * 0.2;
      p.mesh.position.z = p.z;

      // Despawn
      if (p.z > 15) {
        this.scene.remove(p.mesh);
        this.powerUps.splice(i, 1);
      }
    }
  }

  /**
   * Collision detection for Coins, Obstacles, and Power-ups
   */
  private checkCollisions(): void {
    const carX = this.playerX;
    const carY = this.playerY;
    const carZ = 0; // Fixed player reference frame
    const carRadius = 0.85;

    // 1. Coin collection
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      const dx = c.mesh.position.x - carX;
      const dy = c.mesh.position.y - carY;
      const dz = c.z - carZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 1.7) {
        this.coinsCount++;
        soundManager.playCoin();
        this.emitCoinBurst(c.mesh.position.x, c.mesh.position.y, c.mesh.position.z);
        this.scene.remove(c.mesh);
        this.coins.splice(i, 1);
      }
    }

    // 2. Power-up collection
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      const dx = p.mesh.position.x - carX;
      const dz = p.z - carZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 1.8) {
        soundManager.playPowerup();
        if (p.type === 'nitro') {
          this.nitroTimer = 6.0;
        } else {
          this.magnetTimer = 8.0;
        }
        this.scene.remove(p.mesh);
        this.powerUps.splice(i, 1);
      }
    }

    // 3. Obstacle collision
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const obsX = obs.mesh.position.x;
      const obsY = obs.mesh.position.y;
      const obsZ = obs.z;

      // AABB overlap check in 3D
      const xOverlap = Math.abs(carX - obsX) < (carRadius + obs.width * 0.45);
      const zOverlap = Math.abs(carZ - obsZ) < (1.2 + obs.depth * 0.45);

      if (xOverlap && zOverlap) {
        // Check if car jumped cleanly over low barrier
        const carBottom = carY;
        const obstacleTop = obsY + obs.height;

        if (carBottom > obstacleTop * 0.85 && obs.type !== 'traffic') {
          // Clean jump over!
          continue;
        }

        // If Nitro boost is active, smash through obstacle!
        if (this.nitroTimer > 0) {
          soundManager.playCrash();
          this.emitDebrisBurst(obsX, obsY + 0.5, obsZ, 14);
          this.scene.remove(obs.mesh);
          this.obstacles.splice(i, 1);
          this.cameraShakeIntensity = 0.25;
          break;
        }

        // Fatal crash
        this.triggerGameOver(obs);
        break;
      }
    }
  }

  private triggerGameOver(hitObstacle: ObstacleObject): void {
    this.isGameOver = true;
    soundManager.stopEngine();
    soundManager.stopMusic();
    soundManager.playCrash();

    // 60ms hitstop before camera shake & car spinout
    this.hitStopTimer = 0.06;
    this.cameraShakeIntensity = 0.55;

    // Save best score to localStorage
    const currentScore = Math.floor(this.distanceTraveled + this.coinsCount * 25);
    const prevBest = parseInt(localStorage.getItem('blocky_car_highscore') || '0', 10);
    if (currentScore > prevBest) {
      localStorage.setItem('blocky_car_highscore', String(currentScore));
    }

    // Emit debris from crash
    this.emitDebrisBurst(this.playerX, this.playerY + 0.6, 0, 24);

    if (this.onGameOver) {
      this.onGameOver({
        distance: Math.floor(this.distanceTraveled),
        coins: this.coinsCount,
        speed: 0,
        score: currentScore,
        highScore: Math.max(prevBest, currentScore),
        multiplier: 1,
        nitroTime: 0,
        magnetTime: 0,
      });
    }
  }

  private updateGameOverCrash(dt: number): void {
    if (this.playerGroup) {
      // Spectacular voxel car spinout, bounded within the camera view
      this.playerGroup.rotation.x += 6 * dt;
      this.playerGroup.rotation.y += 8 * dt;
      this.playerGroup.rotation.z += 5 * dt;
      if (this.playerGroup.position.y < 3.2) {
        this.playerGroup.position.y += 2.5 * dt;
      }
      if (this.playerGroup.position.z < 3.5) {
        this.playerGroup.position.z += 2.0 * dt;
      }
    }
    this.updateParticles(dt);
    this.updateCamera(dt);
  }

  private emitDust(count: number): void {
    const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.7 });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      const offsetSide = Math.random() > 0.5 ? -0.6 : 0.6;
      mesh.position.set(this.playerX + offsetSide, 0.1, 0.9);

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 0.8 + Math.random() * 1.2,
        vz: 3 + Math.random() * 4,
        life: 0.35,
        maxLife: 0.35,
        rotSpeed: Math.random() * 8,
      });
    }
  }

  private emitCoinBurst(x: number, y: number, z: number): void {
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8,
    });

    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 2.0 + Math.random() * 3.0,
        vz: Math.sin(angle) * speed,
        life: 0.45,
        maxLife: 0.45,
        rotSpeed: (Math.random() - 0.5) * 12,
      });
    }
  }

  private emitDebrisBurst(x: number, y: number, z: number, count: number): void {
    const colors = [0xdc2626, 0x1f2937, 0xfacc15, 0xe2e8f0];
    for (let i = 0; i < count; i++) {
      const s = 0.2 + Math.random() * 0.25;
      const geo = new THREE.BoxGeometry(s, s, s);
      const col = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 12,
        vy: 4 + Math.random() * 8,
        vz: (Math.random() - 0.5) * 12,
        life: 1.2,
        maxLife: 1.2,
        rotSpeed: (Math.random() - 0.5) * 15,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.vy -= 18 * dt; // Gravity
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      p.mesh.rotation.x += p.rotSpeed * dt;
      p.mesh.rotation.y += p.rotSpeed * dt;

      const scale = p.life / p.maxLife;
      p.mesh.scale.set(scale, scale, scale);
    }
  }

  private updateClouds(dt: number): void {
    for (const cloud of this.clouds) {
      cloud.position.x += 1.8 * dt;
      if (cloud.position.x > 80) {
        cloud.position.x = -80;
      }
    }
  }

  private updateCamera(dt: number): void {
    // Dynamic FOV based on speed
    const targetFov = this.nitroTimer > 0 ? 66 : 56 + (this.currentSpeed / this.maxSpeed) * 8;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, dt);
    this.camera.updateProjectionMatrix();

    // Horizontal tracking
    const targetCamX = this.playerX * 0.45;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 10, dt);

    // Apply decaying camera shake
    if (this.cameraShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.cameraShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.x += shakeX;
      this.camera.position.y = this.baseCameraPos.y + shakeY;
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - dt * 1.5);
    } else {
      this.camera.position.y = this.baseCameraPos.y;
    }

    this.camera.lookAt(this.playerX * 0.25, this.baseCameraLookAt.y, this.baseCameraLookAt.z);
  }

  private handleResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * Animation loop with software WebGL guard
   */
  private startLoop(): void {
    const tick = () => {
      const delta = this.clock.getDelta();
      this.update(delta);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 50);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    soundManager.stopEngine();
    soundManager.stopMusic();
    this.renderer.dispose();
  }
}
