import * as THREE from 'three';
import { areas } from '../data/areas';
import { buildPieces, itemDefs } from '../data/items';
import { CameraController } from '../game/CameraController';
import { recordRaycastCall } from '../game/PerfMonitor';
import { hoverRingStyleForEntity } from '../game/WorldFeedback';
import type { AreaId, BuildPieceDef, Entity, GameState, IconDescriptor, Projectile, Vec3, VisualEffect } from '../game/types';
import { AreaManager } from '../world/AreaManager';
import { MODEL_FORWARD_OFFSET } from '../systems/FacingSystem';
import { areaAmbient, MaterialLibrary } from './Materials';
import { estimateRenderFrameMs, renderPerformanceBudget } from './RenderBudgets';
import { RenderMotionTracker, type RenderMotionSample } from './RenderMotion';
import { proceduralDensityProps, type ProceduralDensityProp } from './AreaDensityArtKit';
import { adventureReferencePlan } from './AdventureReferencePlan';
import { briarbrookTownSquareReference } from './TownSquareVisualPlan';
import { VoxelKit } from './VoxelKit';
import { characterAttachPoints, resolveEquipmentVisuals, type EquipmentVisualContract } from './EquipmentVisuals';

interface EntityRecord {
  group: THREE.Group;
  kind: string;
}

interface BoxInstance {
  x: number;
  y: number;
  z: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

interface BoxInstanceBatch {
  material: THREE.Material;
  sx: number;
  sy: number;
  sz: number;
  instances: BoxInstance[];
}

export type RuntimeDynamicLight = [x: number, y: number, z: number, color: string, intensity: number, distance: number];

export const runtimeDynamicLightPlans: Partial<Record<AreaId, RuntimeDynamicLight[]>> = {
  town: [
    [-8, 2.2, -2, '#ffb35a', 0.9, 8],
    [6, 2.2, -3, '#ffb35a', 0.9, 8],
    [0, 2.4, 12, '#ffd27d', 0.75, 8]
  ],
  bank: [
    [-4, 2.4, -3, '#ffc56f', 1.3, 9],
    [5, 2.2, -2, '#ffc56f', 1.0, 8],
    [1.5, 1.8, -1, '#ffd890', 0.8, 7]
  ],
  blacksmith: [
    [2, 1.6, -2, '#ff5b22', 2.3, 10],
    [-5, 2.2, 4, '#ffc06d', 0.9, 7],
    [5, 2.2, -3, '#ffc06d', 0.8, 7]
  ],
  forest: [
    [-6, 4, 4, '#b7f08c', 0.55, 12],
    [6, 2, -6, '#ffc062', 0.8, 8]
  ],
  crypt: [
    [-10, 1.8, 5, '#ff9b3f', 1.25, 9],
    [0, 1.7, -8, '#7ad7ff', 0.95, 9],
    [7, 1.8, 7, '#ffb15f', 1.2, 9]
  ],
  road: [
    [1, 2, 2, '#ffb45f', 1.1, 8],
    [-5, 2, -1, '#ffb45f', 1.0, 8],
    [6, 1.5, -1, '#e45132', 0.55, 7]
  ],
  housing: [
    [-8, 2, 5, '#ffd18a', 0.8, 8],
    [8, 2, 0, '#ffd18a', 0.65, 8]
  ]
};

const MAX_PICK_MESHES_PER_ENTITY = 2;
const PLAYER_HERO_MODEL_URL = new URL('../../assets/exported/models/player_hero.glb', import.meta.url).href;
const PLAYER_HERO_MODEL_YAW_OFFSET = Math.PI;

export function selectPrimaryPickTargetIndexes(volumes: number[], maxTargets = MAX_PICK_MESHES_PER_ENTITY): number[] {
  return volumes
    .map((volume, index) => ({ volume, index }))
    .filter((entry) => entry.volume > 0)
    .sort((a, b) => b.volume - a.volume || a.index - b.index)
    .slice(0, Math.max(0, maxTargets))
    .map((entry) => entry.index)
    .sort((a, b) => a - b);
}

export class VoxelRenderer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 1000);
  readonly renderer: THREE.WebGLRenderer;
  readonly cameraController = new CameraController(this.camera);

  private mats = new MaterialLibrary();
  private kit = new VoxelKit({
    box: (parent, x, y, z, sx, sy, sz, material, rotation) => this.box(parent, x, y, z, sx, sy, sz, material, rotation),
    material: (name, color, options) => this.mats.get(name, color, options)
  });
  private boxGeometries = new Map<string, THREE.BoxGeometry>();
  private staticGroup = new THREE.Group();
  private entityGroup = new THREE.Group();
  private effectGroup = new THREE.Group();
  private ghostGroup = new THREE.Group();
  private records = new Map<string, EntityRecord>();
  private currentArea: AreaId | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private targetRing: THREE.Mesh | null = null;
  private hoverRing: THREE.Mesh | null = null;
  private motion = new RenderMotionTracker();
  private roofMeshes: THREE.Mesh[] = [];
  private roofZones: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [];
  private litKey: string | null = null;
  private lastRaycastCandidateCount = 0;
  private playerHeroModelPromise: Promise<THREE.Object3D | null> | null = null;

  constructor(private canvas: HTMLCanvasElement, private areaManager: AreaManager) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.add(this.staticGroup, this.entityGroup, this.effectGroup, this.ghostGroup);
    this.camera.position.set(9, 11, 9);
    this.camera.lookAt(0, 0, 0);
    this.resize();
  }

  resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.cameraController.resize(width, height);
  }

  render(state: GameState): void {
    if (this.currentArea !== state.player.currentArea) {
      this.currentArea = state.player.currentArea;
      this.rebuildStaticArea(state.player.currentArea);
      this.records.clear();
      this.motion.clear();
      this.cameraController.snapNext();
      this.clearGroup(this.entityGroup);
    }
    this.applyLighting(state.player.currentArea, state.world.time.phase);
    this.mats.animate(state.clock);
    this.cameraController.update(state, state.realtime.lastFrameDelta, this.visualPlayerSample(state).position);
    this.updateEntities(state);
    this.updateEffects(state);
    this.updateBuildGhost(state);
    this.updateRoofCutaway(state);
    this.renderer.render(this.scene, this.camera);
  }

  screenToWorld(clientX: number, clientY: number): Vec3 {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    recordRaycastCall();
    const hit = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, hit);
    return { x: hit.x, y: 0, z: hit.z };
  }

  pickEntity(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    recordRaycastCall();
    const meshes = this.collectPickableMeshes();
    this.lastRaycastCandidateCount = meshes.length;
    const hits = this.raycaster.intersectObjects(meshes, true);
    const object = hits[0]?.object;
    if (!object) return null;
    let cursor: THREE.Object3D | null = object;
    while (cursor) {
      const entityId = cursor.userData.entityId as string | undefined;
      if (entityId) return entityId;
      cursor = cursor.parent;
    }
    return null;
  }

  worldToScreen(position: Vec3): { x: number; y: number; visible: boolean } {
    const vector = new THREE.Vector3(position.x, position.y, position.z).project(this.camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    return { x, y, visible: vector.z > -1 && vector.z < 1 };
  }

  getRenderStats(state: GameState): GameState['dev']['renderStats'] {
    const visibleEntityCount =
      1 +
      Object.values(state.entities).filter((entity) => {
        if (entity.area !== state.player.currentArea) return false;
        if (entity.kind === 'enemy' && entity.state === 'dead') return false;
        if (entity.kind === 'resource' && entity.depleted && entity.resourceType !== 'tree') return false;
        if (entity.kind === 'container' && (entity.hidden || entity.opened)) return false;
        return entity.kind !== 'building' && this.shouldRenderEntity(state, entity);
      }).length +
      state.world.placedBuildings.filter((building) => building.area === state.player.currentArea).length;
    const objectStats = this.collectObjectStats();
    const raycastCandidateCount = this.countPickableMeshes();
    this.lastRaycastCandidateCount = raycastCandidateCount;
    const baseStats = {
      frame: state.realtime.tick,
      fps: state.dev.renderStats.fps ?? 0,
      frameTimeMs: state.dev.renderStats.frameTimeMs ?? 0,
      entityCount: Object.keys(state.entities).length + 1 + state.world.placedBuildings.length,
      visibleEntityCount,
      roughDrawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      meshCount: objectStats.meshCount,
      staticMeshCount: objectStats.staticMeshCount,
      entityMeshCount: objectStats.entityMeshCount,
      effectMeshCount: objectStats.effectMeshCount,
      instancedMeshCount: objectStats.instancedMeshCount,
      instancedInstanceCount: objectStats.instancedInstanceCount,
      materialCount: objectStats.materialCount,
      geometryCount: objectStats.geometryCount,
      raycastCandidateCount,
      memoryAfterTransitionMb: this.readMemoryMb(),
      domNodeCount: state.dev.renderStats.domNodeCount ?? 0,
      visibleWindowCount: state.dev.renderStats.visibleWindowCount ?? 0,
      iconRenderRequestCount: state.dev.renderStats.iconRenderRequestCount ?? 0,
      cachedIconCount: state.dev.renderStats.cachedIconCount ?? 0,
      eventListenerCount: state.dev.renderStats.eventListenerCount ?? 0
    };
    return {
      ...baseStats,
      estimatedFrameMs: estimateRenderFrameMs(baseStats),
      budget: { ...renderPerformanceBudget },
      perf: state.dev.renderStats.perf,
      loop: state.dev.renderStats.loop
    };
  }

  dispose(): void {
    this.clearGroup(this.scene);
    this.boxGeometries.forEach((geometry) => geometry.dispose());
    this.boxGeometries.clear();
    this.mats.dispose();
    this.renderer.dispose();
  }

  private rebuildStaticArea(areaId: AreaId): void {
    this.clearGroup(this.staticGroup);
    this.roofMeshes = [];
    this.roofZones = [];
    const ambient = areaAmbient[areaId];
    this.scene.background = new THREE.Color(ambient.bg);
    const fogRange: Record<AreaId, [number, number]> = {
      town: [18, 58],
      bank: [8, 24],
      blacksmith: [7, 24],
      forest: [10, 38],
      crypt: [6, 27],
      road: [10, 40],
      housing: [14, 46]
    };
    const [near, far] = fogRange[areaId];
    this.scene.fog = new THREE.Fog(ambient.fog, near, far);
    this.buildTerrain(areaId);
    if (areaId === 'town') this.buildTown();
    if (areaId === 'bank') this.buildBankInterior();
    if (areaId === 'blacksmith') this.buildSmithy();
    if (areaId === 'forest') this.buildForest();
    if (areaId === 'crypt') this.buildCrypt();
    if (areaId === 'road') this.buildRoad();
    if (areaId === 'housing') this.buildHousingPlot();
    this.applyProceduralDensityPass(areaId);
    this.batchStaticMeshes();
  }

  private applyLighting(areaId: AreaId, phase: GameState['world']['time']['phase']): void {
    const key = `${areaId}:${phase}`;
    if (this.litKey === key) return;
    this.litKey = key;
    const existing = this.scene.children.filter((child) => child.userData.light);
    existing.forEach((child) => this.scene.remove(child));
    const ambient = areaAmbient[areaId];
    const darkness = phase === 'night' ? 0.58 : phase === 'dusk' ? 0.34 : phase === 'dawn' ? 0.2 : 0;
    const intensityScale = phase === 'night' ? 0.48 : phase === 'dusk' ? 0.68 : phase === 'dawn' ? 0.84 : 1;
    const lampScale = phase === 'night' ? 1.35 : phase === 'dusk' ? 1.18 : 1;
    this.scene.background = new THREE.Color(ambient.bg).lerp(new THREE.Color('#090d16'), darkness);
    const hemi = new THREE.HemisphereLight(ambient.hemi, '#16120d', ambient.intensity * 0.55);
    hemi.intensity *= intensityScale;
    hemi.userData.light = true;
    const sun = new THREE.DirectionalLight(ambient.sun, ambient.intensity);
    sun.intensity *= intensityScale;
    sun.position.set(-5, 12, 4);
    sun.castShadow = areaId !== 'town';
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.userData.light = true;
    this.scene.add(hemi, sun);
    const point = (x: number, y: number, z: number, color: string, intensity: number, distance: number) => {
      const light = new THREE.PointLight(color, intensity * lampScale, distance, 1.8);
      light.position.set(x, y, z);
      light.userData.light = true;
      this.scene.add(light);
    };
    runtimeDynamicLightPlans[areaId]?.forEach((entry) => point(...entry));
  }

  private updateEntities(state: GameState): void {
    const visible = new Set<string>();
    const playerRecord = this.ensureEntity('player', 'player', () => this.makePlayerCharacter());
    this.updatePlayerEquipmentVisuals(playerRecord.group, state);
    const playerMoving = state.player.actionState.kind === 'moving' || Math.hypot(state.player.movement.velocity.x, state.player.movement.velocity.z) > 0.08;
    const playerVisual = this.visualPlayerSample(state);
    const playerBob = this.animateActor(playerRecord.group, state.clock, 'player', playerMoving, Boolean(state.combat.hitFlashes.player), playerVisual.facing, state.ui.reducedMotion);
    this.animatePlayerEquipmentVisuals(playerRecord.group, state);
    playerRecord.group.position.set(playerVisual.position.x, playerVisual.position.y + playerBob, playerVisual.position.z);
    const actionScale = state.player.actionState.kind === 'attacking' ? 1.06 : state.player.actionState.kind === 'casting' ? 1.03 : 1;
    playerRecord.group.scale.setScalar((state.combat.hitFlashes.player ? 1.08 : 1) * actionScale);
    visible.add('player');

    for (const entity of Object.values(state.entities)) {
      if (entity.area !== state.player.currentArea) continue;
      if (entity.kind === 'enemy' && entity.state === 'dead') continue;
      if (entity.kind === 'resource' && entity.depleted && entity.resourceType !== 'tree') continue;
      if (entity.kind === 'container' && (entity.hidden || entity.opened)) continue;
      if (entity.kind === 'building') continue;
      if (!this.shouldRenderEntity(state, entity)) continue;
      const visualKind =
        entity.kind === 'resource'
          ? `${entity.kind}:${entity.resourceType}:${entity.depleted ? 'depleted' : 'active'}:${entity.protected ? 'protected' : 'normal'}:${entity.visualVariant ?? 0}`
          : entity.kind;
      const record = this.ensureEntity(entity.id, visualKind, () => this.makeEntity(entity));
      const actorMoving = entity.kind === 'enemy' ? entity.state === 'chase' || entity.state === 'attack' : entity.kind === 'npc' || entity.kind === 'social';
      const visual = this.motion.sample(entity.id, { position: entity.position, facing: this.facingForEntity(entity, state), snapKey: entity.area }, state.realtime.tick, state.realtime.renderAlpha ?? 1);
      const actorBob = actorMoving || entity.kind === 'enemy' || entity.kind === 'npc' || entity.kind === 'social'
        ? this.animateActor(record.group, state.clock, entity.id, actorMoving, Boolean(state.combat.hitFlashes[entity.id]), visual.facing, state.ui.reducedMotion)
        : 0;
      record.group.position.set(visual.position.x, visual.position.y + actorBob, visual.position.z);
      const gatherPulse = state.gathering?.entityId === entity.id ? 1 + Math.sin(state.clock * 18) * 0.025 : 1;
      record.group.scale.setScalar((state.combat.hitFlashes[entity.id] ? 1.1 : 1) * gatherPulse);
      record.group.userData.entityId = entity.id;
      record.group.traverse((child) => {
        child.userData.entityId = entity.id;
      });
      visible.add(entity.id);
    }

    for (const building of state.world.placedBuildings) {
      if (building.area !== state.player.currentArea) continue;
      const record = this.ensureEntity(building.id, 'placed-building', () => this.makeBuildPiece(building.pieceId, false));
      record.group.position.set(building.position.x, building.position.y, building.position.z);
      record.group.rotation.y = THREE.MathUtils.degToRad(building.rotation);
      visible.add(building.id);
    }

    this.records.forEach((record, id) => {
      if (visible.has(id)) return;
      this.entityGroup.remove(record.group);
      this.disposeObject(record.group);
      this.records.delete(id);
    });
    this.motion.forgetMissing(visible);

    this.updateTargetRing(state);
  }

  private shouldRenderEntity(state: GameState, entity: Entity): boolean {
    if (entity.area !== state.player.currentArea) return false;
    if (state.player.currentArea === 'bank' || state.player.currentArea === 'blacksmith') return true;
    const distanceToPlayer = Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z);
    if (entity.kind === 'enemy') return entity.id === state.player.activeTargetId || distanceToPlayer <= 30;
    if (entity.kind === 'portal') return distanceToPlayer <= 24;
    if (entity.kind === 'resource') return state.gathering?.entityId === entity.id || distanceToPlayer <= 22;
    if (entity.kind === 'loot') return distanceToPlayer <= 16;
    if (entity.kind === 'container') return distanceToPlayer <= 19;
    if (entity.kind === 'npc' || entity.kind === 'social') {
      const actorRadius = state.player.currentArea === 'town' ? 6.9 : 15;
      return state.ui.merchant?.partnerId === entity.id || state.ui.trade?.partnerId === entity.id || distanceToPlayer <= actorRadius;
    }
    return distanceToPlayer <= 24;
  }

  private visualPlayerSample(state: GameState): RenderMotionSample {
    return this.motion.sample(
      'player',
      {
        position: state.player.position,
        facing: state.player.facing?.facingYaw ?? this.facingFromVelocity(state.player.movement.velocity.x, state.player.movement.velocity.z),
        snapKey: state.player.currentArea
      },
      state.realtime.tick,
      state.realtime.renderAlpha ?? 1
    );
  }

  private animateActor(group: THREE.Group, clock: number, seedText: string, moving: boolean, hit: boolean, facing: number, reducedMotion: boolean): number {
    const seed = seedText.length * 0.37;
    const speed = moving ? 9.5 : 2.4;
    const wave = Math.sin(clock * speed + seed);
    const bobScale = reducedMotion ? 0.35 : 1;
    const bob = hit ? 0.08 * bobScale : moving ? Math.abs(wave) * 0.055 * bobScale : Math.sin(clock * 2 + seed) * 0.018 * bobScale;
    const hitWobble = hit && !reducedMotion ? Math.sin(clock * 30 + seed) * 0.12 : 0;
    group.rotation.y = smoothAngle(group.rotation.y, facing + MODEL_FORWARD_OFFSET + hitWobble, 0.28);
    const leftArm = group.getObjectByName('left-arm');
    const rightArm = group.getObjectByName('right-arm');
    const leftLeg = group.getObjectByName('left-leg');
    const rightLeg = group.getObjectByName('right-leg');
    const weapon = group.getObjectByName('weapon');
    if (leftArm) leftArm.rotation.x = moving ? wave * 0.35 * bobScale : Math.sin(clock * 1.7 + seed) * 0.08 * bobScale;
    if (rightArm) rightArm.rotation.x = moving ? -wave * 0.35 * bobScale : Math.sin(clock * 1.9 + seed) * 0.08 * bobScale;
    if (leftLeg) leftLeg.rotation.x = moving ? -wave * 0.22 * bobScale : 0;
    if (rightLeg) rightLeg.rotation.x = moving ? wave * 0.22 * bobScale : 0;
    if (weapon) weapon.rotation.z = hit ? -0.95 : -0.6 + (moving ? -wave * 0.08 * bobScale : 0);
    return bob;
  }

  private facingForEntity(entity: Entity, state: GameState): number {
    if (entity.facing) return entity.facing.facingYaw;
    if (entity.kind === 'enemy') {
      const target = entity.state === 'chase' || entity.state === 'attack' ? state.player.position : entity.leashOrigin;
      return this.facingFromDelta(target.x - entity.position.x, target.z - entity.position.z);
    }
    return 0;
  }

  private facingFromVelocity(x: number, z: number): number {
    if (Math.hypot(x, z) < 0.04) return 0;
    return this.facingFromDelta(x, z);
  }

  private facingFromDelta(x: number, z: number): number {
    return Math.atan2(x, z);
  }

  private updateTargetRing(state: GameState): void {
    if (this.targetRing) {
      this.entityGroup.remove(this.targetRing);
      this.targetRing.geometry.dispose();
      (this.targetRing.material as THREE.Material).dispose();
      this.targetRing = null;
    }
    if (this.hoverRing) {
      this.entityGroup.remove(this.hoverRing);
      this.hoverRing.geometry.dispose();
      (this.hoverRing.material as THREE.Material).dispose();
      this.hoverRing = null;
    }
    const targetId = state.player.activeTargetId;
    const target = targetId ? state.entities[targetId] : null;
    if (target && target.area === state.player.currentArea && target.kind === 'enemy' && target.state !== 'dead') {
      const style = hoverRingStyleForEntity(state, target) ?? { color: '#ff3333', inner: 0.6, outer: 0.78, opacity: 0.9 };
      const ring = this.makeGroundRing(target.position, style.color, style.inner, style.outer, style.opacity);
      this.targetRing = ring;
      this.entityGroup.add(ring);
    }
    const hoverId = state.ui.hoverTarget?.kind === 'entity' ? state.ui.hoverTarget.entityId : null;
    const hover = hoverId ? state.entities[hoverId] : null;
    if (!hover || hover.id === targetId || hover.area !== state.player.currentArea || (hover.kind === 'enemy' && hover.state === 'dead')) return;
    const style = hoverRingStyleForEntity(state, hover);
    if (style) {
      const ring = this.makeGroundRing(hover.position, style.color, style.inner, style.outer, style.opacity);
      this.hoverRing = ring;
      this.entityGroup.add(ring);
    }
  }

  private makeGroundRing(position: Vec3, color: string, inner: number, outer: number, opacity: number): THREE.Mesh {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(position.x, 0.055, position.z);
    return ring;
  }

  private updateEffects(state: GameState): void {
    this.clearGroup(this.effectGroup);
    const projectileLead = (state.realtime.renderAlpha ?? 1) * state.realtime.fixedDelta;
    state.projectiles.forEach((projectile) => this.effectGroup.add(this.makeProjectile(projectile, projectileLead)));
    state.visualEffects.forEach((effect) => {
      if (effect.area !== state.player.currentArea) return;
      this.effectGroup.add(this.makeVisualEffect(effect, state.clock));
    });
    state.combat.telegraphs.forEach((telegraph) => {
      const progress = 1 - telegraph.remaining / telegraph.duration;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(Math.max(0.18, telegraph.radius * 0.35), Math.max(0.28, telegraph.radius * (0.42 + progress * 0.18)), 32),
        this.mats.get(`telegraph-${telegraph.color}`, telegraph.color, { transparent: true, opacity: 0.18 + progress * 0.24, emissive: telegraph.color, emissiveIntensity: 0.3 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(telegraph.targetPosition.x, 0.065, telegraph.targetPosition.z);
      this.effectGroup.add(ring);
    });
    state.world.magicFields.forEach((field) => {
      if (field.area !== state.player.currentArea) return;
      const color = field.kind === 'trap' ? '#ff8a2d' : field.kind === 'bridge' ? '#6fd4ff' : '#ffcf57';
      const pulse = 0.5 + Math.sin(state.clock * 5 + field.createdAt) * 0.5;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.28 + pulse * 0.04, 0.58 + pulse * 0.08, 32),
        this.mats.get(`magic-field-${field.kind}`, color, { transparent: true, opacity: 0.28 + pulse * 0.16, emissive: color, emissiveIntensity: 0.55 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(field.position.x, 0.075, field.position.z);
      this.effectGroup.add(ring);
      if (field.kind === 'bridge') {
        this.box(this.effectGroup, field.position.x, 0.055, field.position.z, 1.08, 0.04, 1.08, this.mats.get('magic-bridge-slab', '#6fd4ff', { transparent: true, opacity: 0.28, emissive: '#6fd4ff', emissiveIntensity: 0.35 }));
      }
      if (field.kind === 'trap') {
        this.box(this.effectGroup, field.position.x, 0.25, field.position.z, 0.18, 0.35 + pulse * 0.16, 0.18, this.mats.get('magic-trap-core', '#ff8a2d', { transparent: true, opacity: 0.52, emissive: '#ff8a2d', emissiveIntensity: 0.8 }));
      }
    });
    Object.entries(state.combat.hitFlashes).forEach(([id, until]) => {
      if (until <= state.clock) return;
      const position = id === 'player' ? state.player.position : state.entities[id]?.position;
      if (!position) return;
      const flash = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.35, 0.9),
        this.mats.get('hit-flash', '#ff3c32', { transparent: true, opacity: 0.32, emissive: '#ff1f18', emissiveIntensity: 0.7 })
      );
      flash.position.set(position.x, position.y + 0.55, position.z);
      this.effectGroup.add(flash);
    });
    this.updateActionEffects(state);
  }

  private updateActionEffects(state: GameState): void {
    if (state.spellCasting) {
      const progress = 1 - state.spellCasting.remaining / state.spellCasting.total;
      for (let i = 0; i < 5; i += 1) {
        const angle = state.clock * 3 + i * 1.256;
        const radius = 0.42 + progress * 0.28;
        this.box(
          this.effectGroup,
          state.player.position.x + Math.cos(angle) * radius,
          state.player.position.y + 0.72 + Math.sin(state.clock * 5 + i) * 0.12,
          state.player.position.z + Math.sin(angle) * radius,
          0.08,
          0.08,
          0.08,
          this.mats.get('spell-windup-particle', '#7ad7ff', { emissive: '#59c8ff', emissiveIntensity: 0.9, transparent: true, opacity: 0.5 + progress * 0.32 })
        );
      }
    }

    const gathering = state.gathering;
    const target = gathering ? state.entities[gathering.entityId] : null;
    if (target?.kind === 'resource' && target.area === state.player.currentArea) {
      const color = target.resourceType === 'ore' ? '#d8d5c9' : target.resourceType === 'tree' ? '#d29a5b' : '#d8f28a';
      const pulse = 0.5 + Math.sin(state.clock * 18) * 0.5;
      for (let i = 0; i < 4; i += 1) {
        const angle = state.clock * 8 + i * Math.PI * 0.5;
        const spread = 0.2 + i * 0.08;
        this.box(
          this.effectGroup,
          target.position.x + Math.cos(angle) * spread,
          target.position.y + 0.35 + pulse * 0.22 + i * 0.03,
          target.position.z + Math.sin(angle) * spread,
          target.resourceType === 'ore' ? 0.08 : 0.12,
          target.resourceType === 'ore' ? 0.08 : 0.05,
          target.resourceType === 'ore' ? 0.08 : 0.12,
          this.mats.get(`gather-spark-${target.resourceType}`, color, { emissive: color, emissiveIntensity: target.resourceType === 'ore' ? 0.65 : 0.2, transparent: true, opacity: 0.52 })
        );
      }
    }
    this.updateFacingDebug(state);
  }

  private updateFacingDebug(state: GameState): void {
    const debug = state.dev.facingDebug;
    if (!debug || (!debug.showFacingArrows && !debug.showDesiredFacingArrows && !debug.showVelocityVectors && !debug.showLookAtLines)) return;
    const actors = [
      { id: 'player', position: state.player.position, facing: state.player.facing, velocity: state.player.movement.velocity },
      ...Object.values(state.entities)
        .filter((entity) => entity.area === state.player.currentArea && (entity.kind === 'enemy' || entity.kind === 'npc' || entity.kind === 'social'))
        .map((entity) => ({ id: entity.id, position: entity.position, facing: entity.facing, velocity: null }))
    ];
    for (const actor of actors) {
      if (!actor.facing) continue;
      if (debug.showFacingArrows) this.addFacingArrow(actor.position, actor.facing.facingYaw, '#70d6ff', 0.72);
      if (debug.showDesiredFacingArrows) this.addFacingArrow({ ...actor.position, y: actor.position.y + 0.08 }, actor.facing.desiredFacingYaw, '#ffd166', 0.92);
      if (debug.showVelocityVectors && actor.velocity) {
        const speed = Math.hypot(actor.velocity.x, actor.velocity.z);
        if (speed > 0.04) this.addDebugLine(actor.position, { x: actor.position.x + (actor.velocity.x / speed) * 0.95, y: actor.position.y, z: actor.position.z + (actor.velocity.z / speed) * 0.95 }, '#6eea78');
      }
      if (debug.showLookAtLines) {
        const target = actor.facing.lookAtEntityId ? state.entities[actor.facing.lookAtEntityId]?.position : actor.facing.lookAtPosition;
        if (target) this.addDebugLine(actor.position, target, '#b66dff');
      }
    }
  }

  private addFacingArrow(position: Vec3, yaw: number, color: string, length: number): void {
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    const origin = new THREE.Vector3(position.x, position.y + 1.55, position.z);
    this.effectGroup.add(new THREE.ArrowHelper(dir, origin, length, color, 0.18, 0.1));
  }

  private addDebugLine(from: Vec3, to: Vec3, color: string): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(from.x, from.y + 1.35, from.z), new THREE.Vector3(to.x, to.y + 1.35, to.z)]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.76 }));
    this.effectGroup.add(line);
  }

  private updateBuildGhost(state: GameState): void {
    this.clearGroup(this.ghostGroup);
    if (!state.buildMode.active || state.player.currentArea !== 'housing') return;
    const ghostColor = this.buildGhostColor(state);
    const ghost = this.makeBuildPiece(state.buildMode.selectedPieceId, true, ghostColor);
    ghost.position.set(state.buildMode.ghostPosition.x, 0.08, state.buildMode.ghostPosition.z);
    ghost.rotation.y = THREE.MathUtils.degToRad(state.buildMode.rotation);
    this.ghostGroup.add(ghost);
    const selectedPiece = buildPieces.find((piece) => piece.id === state.buildMode.selectedPieceId) ?? buildPieces[0];
    const footprintMat = this.mats.get(`build-footprint-${ghostColor}`, ghostColor, { transparent: true, opacity: 0.24, emissive: ghostColor, emissiveIntensity: 0.18 });
    this.box(this.ghostGroup, state.buildMode.ghostPosition.x, 0.075, state.buildMode.ghostPosition.z, selectedPiece.size.x, 0.035, selectedPiece.size.z, footprintMat);
    const yaw = THREE.MathUtils.degToRad(state.buildMode.rotation);
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize(), new THREE.Vector3(state.buildMode.ghostPosition.x, 0.45, state.buildMode.ghostPosition.z), 0.9, ghostColor, 0.22, 0.14);
    this.ghostGroup.add(arrow);
    const grid = new THREE.GridHelper(12, 12, state.buildMode.valid ? '#9af4a4' : ghostColor, '#d7ffe0');
    grid.position.y = 0.06;
    grid.position.x = 0;
    grid.position.z = 0.5;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    this.ghostGroup.add(grid);
    const plot = this.areaManager.getBuildPlot();
    const boundaryMat = this.mats.get(`plot-boundary-${state.buildMode.valid ? 'valid' : 'invalid'}`, state.buildMode.valid ? '#baf0a2' : '#ff8f7f', {
      transparent: true,
      opacity: 0.78,
      emissive: state.buildMode.valid ? '#4a9d45' : '#a43a2e',
      emissiveIntensity: 0.25
    });
    const width = plot.maxX - plot.minX + 1;
    const depth = plot.maxZ - plot.minZ + 1;
    const centerX = (plot.minX + plot.maxX) / 2;
    const centerZ = (plot.minZ + plot.maxZ) / 2;
    this.box(this.ghostGroup, centerX, 0.09, plot.minZ - 0.5, width, 0.05, 0.08, boundaryMat);
    this.box(this.ghostGroup, centerX, 0.09, plot.maxZ + 0.5, width, 0.05, 0.08, boundaryMat);
    this.box(this.ghostGroup, plot.minX - 0.5, 0.09, centerZ, 0.08, 0.05, depth, boundaryMat);
    this.box(this.ghostGroup, plot.maxX + 0.5, 0.09, centerZ, 0.08, 0.05, depth, boundaryMat);
  }

  private buildGhostColor(state: GameState): string {
    if (state.buildMode.valid) return '#60d871';
    if (/need|higher plot tier|materials/i.test(state.buildMode.message)) return '#f0b84d';
    return '#e84a4a';
  }

  private buildTerrain(areaId: AreaId): void {
    const bounds = this.areaManager.getAreaBounds(areaId);
    const palette = areas[areaId].palette;
    const groundBatches = new Map<string, BoxInstanceBatch>();
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
        const height = this.areaManager.getHeight(areaId, x, z);
        const material = this.getGroundMaterial(areaId, x, z);
        this.queueInstancedBox(groundBatches, material, 1, 0.16, 1, { x, y: height - 0.08, z });
        this.decorateTerrainTile(areaId, x, z, height);
        if (palette === 'forest' && height > 0) {
          this.queueInstancedBox(groundBatches, this.mats.get('dirt', '#5c4227'), 1, 1.2, 1, { x, y: height - 0.7, z });
        }
      }
    }
    this.flushInstancedBoxBatches(this.staticGroup, groundBatches);
  }

  private getGroundMaterial(areaId: AreaId, x: number, z: number): THREE.Material {
    if (areaId === 'crypt') return this.variedMaterial('crypt-floor', ['#282826', '#2e2d2b', '#242424', '#34302c'], x, z);
    if (areaId === 'bank' || areaId === 'blacksmith') return this.variedMaterial('interior-stone', ['#5d564d', '#665f54', '#56514b', '#6b6255'], x, z);
    if (areaId === 'road' && (Math.abs(z - x * 0.08) < 3.4 || (x > -8 && x < 9 && z > -5 && z < 5))) return this.variedMaterial('road-cobble', ['#777368', '#837f72', '#6f6c63', '#8a8375'], x, z);
    if (areaId === 'town' && x < -13 && z > 14) return this.mats.get('river', '#214f6c', { transparent: true, opacity: 0.82 });
    if (
      areaId === 'town' &&
      (Math.abs(x) < 7 ||
        Math.abs(z) < 7 ||
        (z > 6 && Math.abs(x) < 3) ||
        (x < -8 && z > 8) ||
        (x > 8 && Math.abs(z - 4) < 3))
    ) {
      return this.variedMaterial('town-cobble', ['#787469', '#817d70', '#6e6a61', '#8a8375'], x, z);
    }
    if (areaId === 'housing' && z > 6) return this.mats.get('water', '#235d7c', { transparent: true, opacity: 0.82, roughness: 0.35 });
    if (areaId === 'housing' && Math.abs(x) < 7 && Math.abs(z) < 6) return this.variedMaterial('plot-grass', ['#607f3d', '#658a42', '#557638', '#6f9148'], x, z);
    if (areaId === 'forest' && this.isForestPathTile(x, z)) return this.variedMaterial('forest-path', ['#746a4d', '#6a6045', '#7e724f', '#5f5942'], x, z);
    if (areaId === 'forest' && z < -10 && x > -2 && x < 14) return this.variedMaterial('forest-rock', ['#67645d', '#5f5c56', '#706d65', '#57534e'], x, z);
    if (areaId === 'forest') return this.variedMaterial('forest-grass', ['#496c35', '#52763c', '#426330', '#5a7b42'], x, z);
    return this.variedMaterial('grass', ['#647f43', '#6c8a49', '#5d7740', '#718d4d'], x, z);
  }

  private variedMaterial(name: string, colors: string[], x: number, z: number, options: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.Material {
    const index = Math.abs(Math.floor(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453)) % colors.length;
    return this.mats.get(`${name}-${index}`, colors[index], options);
  }

  private tileHash(x: number, z: number): number {
    return Math.abs(Math.floor(Math.sin(x * 127.1 + z * 311.7) * 10000));
  }

  private isForestPathTile(x: number, z: number): boolean {
    const nearSegment = (ax: number, az: number, bx: number, bz: number, width: number) => {
      const dx = bx - ax;
      const dz = bz - az;
      const lengthSq = dx * dx + dz * dz;
      const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
      const px = ax + dx * t;
      const pz = az + dz * t;
      return Math.hypot(x - px, z - pz) <= width;
    };
    return (
      nearSegment(0, 11, 0, 5, 1.7) ||
      nearSegment(0, 5, 7, -5, 1.8) ||
      nearSegment(0, 5, 11, 4, 1.85) ||
      nearSegment(0, 6, -9, 8, 1.45) ||
      (z < -10 && x > -2 && x < 14)
    );
  }

  private decorateTerrainTile(areaId: AreaId, x: number, z: number, height: number): void {
    if ((areaId === 'town' && x < -13 && z > 14) || (areaId === 'housing' && z > 6)) return;
    const hash = this.tileHash(x, z);
    const y = height + 0.025;
    if ((areaId === 'town' || areaId === 'road') && hash % 31 === 0) {
      this.box(this.staticGroup, x + 0.05, y + 0.01, z - 0.02, 0.5, 0.025, 0.32, this.mats.get('wet-cobble', '#2f3f43', { transparent: true, opacity: 0.38 }), { ry: (hash % 8) * 0.18 });
      return;
    }
    if (areaId === 'town' && hash % 19 === 0) {
      this.box(this.staticGroup, x + 0.18, y, z - 0.22, 0.28, 0.04, 0.18, this.mats.get('cobble-chip', hash % 2 ? '#9a9382' : '#5e5a53'), { ry: (hash % 6) * 0.2 });
      return;
    }
    if ((areaId === 'town' || areaId === 'housing') && hash % 23 === 0) {
      this.box(this.staticGroup, x - 0.22, y + 0.08, z + 0.14, 0.1, 0.18, 0.1, this.mats.get('grass-tuft', '#78984b'));
      return;
    }
    if (areaId === 'forest' && hash % 7 === 0) {
      this.box(this.staticGroup, x + ((hash % 5) - 2) * 0.08, y + 0.1, z, 0.12, 0.26, 0.12, this.mats.get('forest-tuft', hash % 2 ? '#6f9548' : '#5b843c'));
      return;
    }
    if (areaId === 'forest' && hash % 11 === 0) {
      this.box(this.staticGroup, x - 0.15, y + 0.03, z + 0.18, 0.52, 0.06, 0.12, this.mats.get('forest-root', '#4e3420'), { ry: (hash % 10) * 0.25 });
      return;
    }
    if (areaId === 'crypt' && hash % 17 === 0) {
      this.box(this.staticGroup, x + 0.12, y, z - 0.1, 0.5, 0.035, 0.055, this.mats.get('floor-crack', '#151515'), { ry: (hash % 8) * 0.3 });
      return;
    }
    if (areaId === 'crypt' && hash % 29 === 0) {
      this.box(this.staticGroup, x - 0.18, y + 0.04, z + 0.06, 0.2, 0.08, 0.16, this.mats.get('crypt-rubble', '#5a5750'), { ry: (hash % 9) * 0.2 });
      return;
    }
    if (areaId === 'road' && hash % 13 === 0) {
      this.box(this.staticGroup, x + 0.2, y + 0.04, z + 0.12, 0.18, 0.08, 0.18, this.mats.get('road-pebble', hash % 2 ? '#868073' : '#5c574f'));
    }
  }

  private applyProceduralDensityPass(areaId: AreaId): void {
    const props = proceduralDensityProps.filter((prop) => prop.area === areaId);
    if (!props.length) return;
    const batches = new Map<string, BoxInstanceBatch>();
    props.forEach((prop) => this.queueDensityProp(batches, prop));
    this.flushInstancedBoxBatches(this.staticGroup, batches);
  }

  private queueDensityProp(batches: Map<string, BoxInstanceBatch>, prop: ProceduralDensityProp): void {
    const groundY = this.areaManager.getHeight(prop.area, Math.round(prop.x), Math.round(prop.z));
    const enqueue = (
      suffix: string,
      color: string,
      sx: number,
      sy: number,
      sz: number,
      ox: number,
      oy: number,
      oz: number,
      ry = 0,
      options: Partial<THREE.MeshStandardMaterialParameters> = {}
    ) => {
      const cos = Math.cos(prop.rotation);
      const sin = Math.sin(prop.rotation);
      const rx = ox * cos - oz * sin;
      const rz = ox * sin + oz * cos;
      this.queueInstancedBox(
        batches,
        this.mats.get(`density-${prop.materialVariant}-${suffix}`, color, options),
        sx,
        sy,
        sz,
        { x: prop.x + rx, y: groundY + oy, z: prop.z + rz, ry: prop.rotation + ry }
      );
    };
    const base = this.densityRenderColor(prop.kind, prop.area);

    if (prop.kind === 'grass_tuft') {
      enqueue('blade', base, 0.11, 0.26, 0.1, 0, 0.15, 0, 0.12);
      return;
    }
    if (prop.kind === 'flower') {
      enqueue('bloom', base, 0.14, 0.18, 0.14, 0, 0.17, 0, 0.12);
      return;
    }
    if (prop.kind === 'stone_chip') {
      enqueue('chip', base, 0.34, 0.08, 0.22, 0, 0.055, 0, 0.1);
      return;
    }
    if (prop.kind === 'crate') {
      enqueue('crate', base, 0.52, 0.46, 0.52, 0, 0.25, 0, 0.04);
      return;
    }
    if (prop.kind === 'barrel') {
      enqueue('barrel', base, 0.44, 0.58, 0.44, 0, 0.31, 0, 0);
      return;
    }
    if (prop.kind === 'sign_stake') {
      enqueue('post', '#5b351b', 0.12, 0.92, 0.12, 0, 0.47, 0, 0);
      enqueue('board', base, 0.78, 0.36, 0.08, 0, 0.93, -0.05, 0);
      return;
    }
    if (prop.kind === 'wood_plank') {
      enqueue('plank', base, 0.88, 0.08, 0.18, 0, 0.07, 0, 0);
      return;
    }
    if (prop.kind === 'rubble') {
      enqueue('rubble', base, 0.28, 0.14, 0.22, 0, 0.08, 0, 0);
      return;
    }
    if (prop.kind === 'bone_chip') {
      enqueue('bone', base, 0.1, 0.08, 0.48, 0, 0.06, 0, 0.45);
      return;
    }
    if (prop.kind === 'mushroom') {
      enqueue('cap', base, 0.22, 0.18, 0.22, 0, 0.17, 0, 0);
      return;
    }
    if (prop.kind === 'ore_chip') {
      enqueue('ore', base, 0.22, 0.16, 0.18, 0, 0.1, 0, 0.1, { emissive: base, emissiveIntensity: 0.08 });
      return;
    }
    if (prop.kind === 'plot_stake') {
      enqueue('stake', base, 0.12, 0.82, 0.12, 0, 0.42, 0, 0);
    }
  }

  private densityRenderColor(kind: ProceduralDensityProp['kind'], area: AreaId): string {
    if (kind === 'grass_tuft') return area === 'road' ? '#5f7d43' : '#52763c';
    if (kind === 'flower') return area === 'housing' ? '#8ee0a1' : '#dfd8b1';
    if (kind === 'stone_chip') return area === 'crypt' ? '#5f5b55' : area === 'road' ? '#868073' : '#8a8375';
    if (kind === 'crate') return '#7a4d27';
    if (kind === 'barrel') return '#6b421f';
    if (kind === 'sign_stake') return area === 'road' ? '#9a6430' : '#2b5f92';
    if (kind === 'wood_plank') return '#6a421f';
    if (kind === 'rubble') return '#57534e';
    if (kind === 'bone_chip') return '#d8d0bd';
    if (kind === 'mushroom') return '#d4664b';
    if (kind === 'ore_chip') return '#3e8bda';
    if (kind === 'plot_stake') return '#8ee0a1';
    return '#77746d';
  }

  private buildTown(): void {
    this.townBuildingBlockout();
    this.townPlazaCore();
    this.townServiceStreet();
    this.townMarketStreet();
    this.townWaterfrontEdge();
    this.townExitMarkers();
    this.townPavingMosaic();
    this.townRouteGrounding();
    this.townSquareReferenceDressing();
    this.townEdgeDressing();
  }

  private townBuildingBlockout(): void {
    this.house(-9, -6, 4, 3, true);
    this.house(4, -7, 5, 3, false);
    this.house(8, 1, 5, 4, false);
    this.house(-13, 5, 4, 6, true);
    this.house(-20, -9, 5, 4, false);
    this.house(-18, -3, 5, 4, true);
    this.house(14, -10, 5, 4, true);
    this.house(15, 6, 5, 4, false);
    this.house(17, 12, 4, 3, false);
    this.wallLine(-21, -13, -21, 15);
    this.wallLine(-21, 15, -15, 15);
    this.wallLine(21, -12, 21, 13);
    this.wallLine(13, 15, 21, 15);
  }

  private townPlazaCore(): void {
    this.fountain(0, 0);
    this.sign(2, 8, 'Briarbrook');
    for (const [x, z, accent] of [
      [-4, -2, '#dfd8b1'],
      [4, -1, '#cd584c'],
      [-4, 4, '#6f87d4'],
      [4, 4, '#e8bf4b']
    ] as Array<[number, number, string]>) {
      this.plazaPlanter(x, z, accent);
    }
    for (const bench of briarbrookTownSquareReference.dressing.benches) this.bench(bench.position.x, bench.position.z);
    for (const lamp of briarbrookTownSquareReference.dressing.lamps) this.lantern(lamp.position.x, lamp.position.z);
  }

  private townServiceStreet(): void {
    for (const service of briarbrookTownSquareReference.serviceEntrances) {
      this.sign(service.signPosition.x, service.signPosition.z, service.label);
      this.servicePlaque(service.servicePosition.x, service.servicePosition.z, service.accent);
    }
    this.forgeSmokeMarker(6, -3);
    this.gardenPatch(-3, -10);
    this.alchemyTable(-16, 0);
    this.scribeDesk(15, -6);
    this.worktable(-12, 2, '#a66b2e');
    this.crates(-8, -1);
    this.sack(-7.2, -0.6);
    this.crates(5, -2.2);
    this.sack(5.8, -1.95);
    for (const [x, z] of [
      [-10, -6],
      [9, 0],
      [-18, -3]
    ] as Array<[number, number]>) {
      this.flowerBox(x, z);
    }
  }

  private townMarketStreet(): void {
    this.marketStall(7, 3, '#2c6bb8');
    this.marketStall(10, 5, '#efe6c8');
    this.marketStall(4, 8, '#3e8f52');
    this.marketStall(-7, 3, '#a8483d');
    for (const stack of briarbrookTownSquareReference.dressing.marketStacks) this.marketStack(stack.position.x, stack.position.z);
    this.cart(10, 8, '#7f4a24');
    this.loom(15, 8);
    this.worktable(18, 10, '#8f5f2a');
    this.tinkerBench(13, 12);
    this.crates(6, 5);
    this.sack(7.1, 5.25);
    this.crates(10, 2.5);
    this.sack(9.4, 2.8);
    this.flowerBox(15, 6);
  }

  private townWaterfrontEdge(): void {
    this.marketStall(-15, 10, '#c1a24a');
    this.dock(-11, 9);
    this.dock(-17, 15);
    this.boat(-18, 16);
    this.well(-6, 8);
    this.cart(-14, -6, '#7f4a24');
    this.gardenPatch(12, 10);
    this.cookingFire(-18, -5);
    this.crates(-8, 5);
    this.sack(-6.9, 4.75);
  }

  private townExitMarkers(): void {
    for (const exit of briarbrookTownSquareReference.exitSigns) {
      this.sign(exit.position.x, exit.position.z, exit.label);
      this.routeStone(exit.position.x, exit.position.z, exit.accent);
    }
  }

  private townEdgeDressing(): void {
    for (const [x, z] of [
      [-9, -2],
      [5, -4],
      [12, 3],
      [-16, 10],
      [18, 8],
      [-18, -8]
    ] as Array<[number, number]>) {
      this.barrel(x, z);
      this.sack(x + 0.65, z + 0.25);
    }
  }

  private buildBankInterior(): void {
    this.interiorShell('#49301d', '#796c5b');
    this.counter(-2.5, -1.2, 6);
    this.bankServiceDressing();
    this.bankCustomerLane();
    this.chest(2.8, -1.8);
    this.chest(-3.8, -1.9);
    this.banner(3, -4);
    this.banner(-3.8, -4);
    this.rug(0, 2.35, '#1e486e');
    this.crates(-5.2, 0.9);
    this.crates(5.0, 2.8);
    this.barrel(-5.8, 2.3);
    this.sack(4.6, 4.2);
    this.ledgerDesk(-2.8, 3.8);
    this.ledgerDesk(3.0, 3.6);
    this.lantern(-4.8, -3.2);
    this.lantern(4.8, -3.2);
    this.lantern(-5.2, 4.2);
    this.lantern(5.2, 4.1);
  }

  private buildSmithy(): void {
    this.interiorShell('#4c2f1d', '#75695e');
    this.forge(2.4, -2.4);
    this.smithyServiceDressing();
    this.anvil(0, 0.8);
    this.oreBins(-5, -2);
    this.oreBins(3.9, 3.2);
    this.toolRack(-4.8, -4);
    this.toolRack(5, 0.7);
    this.banner(-2, -4);
    this.worktable(-3.2, 3.1, '#a9773b');
    this.worktable(4.5, -4.0, '#b96b31');
    this.quenchTub(1.2, 2.8);
    this.weaponStand(-1.6, -3.4);
    this.barrel(5, 3);
    this.sack(-5.4, -3.2);
    this.lantern(-5, 4);
    this.lantern(5, -3);
    this.lantern(0, -4.3);
  }

  private buildForest(): void {
    this.forestPathNetwork();
    this.forestMineApproach();
    this.forestGatheringClearing();
    this.forestBridgeAndTownRoad();
    this.forestUnderstoryDressing();
    this.flowers();
  }

  private buildCrypt(): void {
    this.cryptWalls();
    this.cryptEntranceThreshold();
    this.cryptCentralCombatChamber();
    this.cryptSecretReliquary();
    this.cryptAltarNiche();
    this.cryptFloorBreakupAndRubble();
    this.cryptReferenceDressing();
  }

  private cryptEntranceThreshold(): void {
    this.cryptDoorMarker(-9, 4);
    this.wallLine(-12, -4, -7, -4);
    this.torchPost(-11, 5);
    this.torchPost(-7, 4);
    this.torchPool(-9, 4);
    this.chain(-13, 6);
    this.chain(-13, 2);
    this.crackedWall(-14.8, 5.5);
    this.rubble(-12, 2);
    this.rubble(-8, 7);
    this.bones(-10, 6);
    this.cryptFloorRune(-9, 3);
  }

  private cryptCentralCombatChamber(): void {
    for (const [x, z] of [
      [-4, -4],
      [2, -5],
      [6, -3],
      [-6, 4],
      [4, 4],
      [0, 0],
      [-10, -4],
      [10, 2],
      [4, 8]
    ] as Array<[number, number]>) this.column(x, z);
    this.wallLine(8, 2, 13, 2);
    this.wallLine(2, 8, 7, 8);
    for (const [x, z] of adventureReferencePlan.crypt.lighting.torchPools.map((pool) => [pool.x, pool.z] as [number, number])) {
      this.torchPost(x, z);
      this.torchPool(x, z);
    }
    this.sarcophagus(3, -7);
    this.tomb(-6, -8);
    this.bones(-1, 4);
    this.bones(8, 7);
    this.bones(-9, -7);
    this.blood(5, 3);
    this.candle(-2, -2);
    this.candle(3, 6);
    this.brokenWeapon(1, 6);
    this.brokenWeapon(-8, -2);
  }

  private cryptSecretReliquary(): void {
    this.cryptPedestal(7, 7);
    this.candle(6.2, 6.2);
    this.candle(7.8, 6.2);
    this.candle(7.2, 8.1);
    this.hiddenNiche(-12, 6);
    this.cryptLever(-13, 6);
    this.falseCryptDoor(-2, 9);
    this.crackedWall(-14.8, 6);
    this.crackedWall(-2, 12.4);
    this.rubble(-12, 8);
    this.rubble(11, 8);
    this.chest(12, -8);
    this.cryptPedestal(12, -8);
    this.chain(13, 9);
    this.bones(11, -7);
  }

  private cryptAltarNiche(): void {
    this.cryptAltar(0, -8);
    this.sarcophagus(-3, -8);
    this.tomb(3, -9);
    this.candle(-1.2, -6.8);
    this.candle(1.2, -6.8);
    this.cryptFloorRune(0, -6);
    this.rubble(-4, -10);
    this.rubble(4, -7);
    this.chain(-13, -9);
  }

  private cryptFloorBreakupAndRubble(): void {
    for (const [x, z] of [
      [-4, 2],
      [2, -2],
      [7, 5],
      [-10, 7],
      [11, -2],
      [-6, -1],
      [6, 0],
      [0, 5],
      [-2, 10]
    ] as Array<[number, number]>) this.crackedFloorCluster(x, z);
    for (const [x, z] of [
      [-11, 2],
      [12, -4],
      [-3, 7],
      [9, -1],
      [2, 10]
    ] as Array<[number, number]>) this.rubble(x, z);
  }

  private buildRoad(): void {
    this.roadRiverEdge();
    this.roadCombatLane();
    this.roadCheckpointEdge();
    this.roadCombatPocketDressing();
    this.roadReferenceDressing();
  }

  private roadRiverEdge(): void {
    this.waterEdge(8);
    this.bridge(6, 8);
    for (const [x, z] of [
      [3, 7],
      [8, 7],
      [11, 6],
      [-8, 7],
      [-12, 7]
    ] as Array<[number, number]>) {
      this.rockScatter(x, z);
      this.bushPatch(x + 0.5, z - 0.55);
    }
    this.lowFence(-13, 7, -5, 7);
    this.lowFence(4, 7, 12, 7);
    this.lowFence(-13, 10, 13, 10);
  }

  private roadCombatLane(): void {
    this.roadPavingBreakup();
    for (const lamp of adventureReferencePlan.road.dressing.lanternPosts) this.torchPost(lamp.x, lamp.z);
    this.torchPost(4, -2);
    this.torchPost(-8, 3);
    this.wagonTracks(-4, -3);
    this.wagonTracks(1, -1);
    this.wagonTracks(6, 2);
    this.sign(9, -4, 'Old Bridge');
    this.sign(2, -6, 'Bandit Warning');
    this.lowFence(-11, -6, -3, -6);
    this.lowFence(7, -5, 12, -4);
  }

  private roadCheckpointEdge(): void {
    this.checkpointGate(-8, 1);
    this.sign(-7, 1, 'Town Gate');
    this.crates(-10, 2.6);
    this.sack(-9.2, 2.9);
    this.barrel(-6, 2.4);
    this.logPile(-11, 4);
    this.bushPatch(-9, 5);
    this.roadsideStoneWall(-12, -5, -8, -3);
  }

  private roadCombatPocketDressing(): void {
    for (const pocket of adventureReferencePlan.road.combatPockets) {
      this.routeStone(pocket.x, pocket.z, '#8a8375');
    }
    this.bushPatch(6, 5);
    this.bushPatch(10, -3);
    this.bushPatch(-5, -5);
    this.logPile(9, 1);
    this.bones(7, -3);
    this.brokenWeapon(3, -1);
    this.rockScatter(-2, 4);
    this.rockScatter(12, -1);
  }

  private roadPavingBreakup(): void {
    const highlights: BoxInstance[] = [];
    const ruts: BoxInstance[] = [];
    const stones = adventureReferencePlan.road.dressing.roadStones;
    for (let x = -12; x <= 12; x += 1) {
      for (let z = -6; z <= 6; z += 1) {
        if (Math.abs(z - x * 0.08) > 3.4 && !stones.some((stone) => Math.hypot(stone.x - x, stone.z - z) <= 2.6)) continue;
        const hash = this.tileHash(x * 5, z * 7);
        if (hash % 2 === 0) highlights.push({ x: x + ((hash % 5) - 2) * 0.05, y: 0.04, z: z + ((hash % 7) - 3) * 0.04, ry: (hash % 8) * 0.22 });
        if (hash % 5 === 0) ruts.push({ x, y: 0.055, z: z + 0.12, ry: 0.1 + (hash % 3) * 0.04 });
      }
    }
    this.instancedBoxes(this.staticGroup, 'road-paving-highlight', '#928b7d', 0.48, 0.035, 0.18, highlights);
    this.instancedBoxes(this.staticGroup, 'road-rut-dark', '#4f3c2a', 0.72, 0.03, 0.07, ruts);
  }

  private roadsideStoneWall(x1: number, z1: number, x2: number, z2: number): void {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
    const stone = this.mats.get('roadside-stone-wall', '#6e6a62');
    for (let i = 0; i <= steps; i += 1) {
      const t = steps === 0 ? 0 : i / steps;
      const x = Math.round(THREE.MathUtils.lerp(x1, x2, t));
      const z = Math.round(THREE.MathUtils.lerp(z1, z2, t));
      this.box(this.staticGroup, x, 0.25, z, 0.86, 0.32, 0.42, stone, { ry: (i % 3) * 0.1 });
    }
  }

  private forestPathNetwork(): void {
    const pathMarkers: BoxInstance[] = [];
    for (const path of adventureReferencePlan.forest.pathNetwork) {
      const steps = Math.max(Math.abs(path.to.x - path.from.x), Math.abs(path.to.z - path.from.z), 1);
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const x = THREE.MathUtils.lerp(path.from.x, path.to.x, t);
        const z = THREE.MathUtils.lerp(path.from.z, path.to.z, t);
        const hash = this.tileHash(Math.round(x) * 3, Math.round(z) * 5);
        if (hash % 2 === 0) pathMarkers.push({ x: x + ((hash % 3) - 1) * 0.1, y: 0.045, z: z + ((hash % 5) - 2) * 0.06, ry: (hash % 10) * 0.16 });
      }
    }
    this.instancedBoxes(this.staticGroup, 'forest-path-pebble', '#8a7a56', 0.42, 0.035, 0.15, pathMarkers);
  }

  private forestMineApproach(): void {
    this.mineEntrance(7, -8);
    this.mineTrack(6.2, -5.8);
    this.oreCluster(5, -2, '#9ba5a3');
    this.oreCluster(8, -3, '#9ba5a3');
    this.oreCluster(12, -7, '#b77745');
    this.rockScatter(6, -5);
    this.rockScatter(9, -7);
    this.rockScatter(11, -9);
    this.torchPost(6, -6);
    this.sign(7, -6, 'Mine');
    this.crates(5.2, -7.2);
    this.sack(4.4, -6.8);
    this.cart(9.8, -6.2, '#6e4a25');
    this.brokenWeapon(6, -9);
  }

  private forestGatheringClearing(): void {
    this.oreCluster(-7, 3, '#b77745');
    this.logPile(10, -1);
    this.logPile(9, 6);
    this.stump(10, 6);
    this.mushrooms(10.8, 6.4);
    this.bushPatch(13, 2);
    this.bushPatch(8, 6);
    this.forageClue(11, 5.5);
    this.fallenBranch(6, 5);
  }

  private forestBridgeAndTownRoad(): void {
    for (let z = 2; z <= 12; z += 1) this.streamTile(-5 + Math.sin(z * 0.7) * 1.2, z);
    this.bridge(0, 6);
    this.bridge(-5, 8);
    this.sign(0, 12, 'Briarbrook');
    this.torchPost(-1, 9);
    this.torchPost(2, 6);
    this.lowFence(-4, 8, -1, 8);
    this.lowFence(2, 8, 6, 8);
  }

  private forestUnderstoryDressing(): void {
    this.gardenPatch(-9, 8);
    this.gardenPatch(3, 9);
    for (const [x, z] of [
      [-13, -5],
      [-10, 3],
      [-2, -8],
      [2, 2],
      [14, 2],
      [-14, 10],
      [-6, 12],
      [15, -2]
    ] as Array<[number, number]>) {
      this.stump(x, z);
      this.mushrooms(x + 0.8, z + 0.4);
    }
    this.logPile(-7, -7);
    this.rockScatter(-13, 5);
    this.rockScatter(12, -9);
    this.fallenBranch(-2, 10);
    this.bushPatch(-12, 10);
    this.bushPatch(11, 8);
    this.bushPatch(-6, -10);
    this.bushPatch(4, 11);
    for (const clue of adventureReferencePlan.forest.dressing.forageClues) this.forageClue(clue.x, clue.z);
  }

  private buildHousingPlot(): void {
    this.wallLine(-8, -7, 8, -7);
    this.wallLine(-8, 7, 8, 7);
    this.wallLine(-8, -7, -8, 7);
    this.wallLine(8, -7, 8, 7);
    this.plotBoundaryFence();
    this.plotBuildGrid();
    this.dock(-9, 8);
    this.boat(-5, 9);
    this.house(10, -6, 4, 3, false);
    this.bench(-5, -5);
    this.gardenPatch(-3.2, 3.2);
    this.gardenPatch(-1.4, 3.6);
    this.worktable(3.9, -4, '#d9bd89');
    this.utilityStaging(4.7, 2.8);
    this.buildGhostMarker(-1.8, 0.7);
    this.lantern(-6, -2);
    this.lantern(5.6, 0.3);
    this.barrel(-7, 6);
    this.crates(6, -6);
    this.crates(4.9, 4.8);
    this.flowerBox(9, -7);
    this.plotMarker(0, 0);
  }

  private plotBoundaryFence(): void {
    for (let x = -5; x <= 5; x += 1) {
      if (x !== -1 && x !== 0) this.plotFencePost(x, -4.5);
      this.plotFencePost(x, 5.5);
    }
    for (let z = -4; z <= 5; z += 1) {
      this.plotFencePost(-5.5, z);
      this.plotFencePost(5.5, z);
    }
    this.plotFenceRail(-4, -4.5, 3.5, true);
    this.plotFenceRail(2.5, -4.5, 2.5, true);
    this.plotFenceRail(0, 5.5, 10.8, true);
    this.plotFenceRail(-5.5, 0.5, 9.5, false);
    this.plotFenceRail(5.5, 0.5, 9.5, false);
  }

  private plotFencePost(x: number, z: number): void {
    const wood = this.mats.get('plot-fence-post', '#6b421f');
    this.box(this.staticGroup, x, 0.36, z, 0.16, 0.72, 0.16, wood);
  }

  private plotFenceRail(x: number, z: number, length: number, horizontal: boolean): void {
    const rail = this.mats.get('plot-fence-rail', '#7b4d2b');
    this.box(this.staticGroup, x, 0.45, z, horizontal ? length : 0.12, 0.12, horizontal ? 0.12 : length, rail);
    this.box(this.staticGroup, x, 0.24, z, horizontal ? length : 0.12, 0.1, horizontal ? 0.1 : length, rail);
  }

  private plotBuildGrid(): void {
    const grid = this.mats.get('plot-build-grid', '#8ee0a1', { transparent: true, opacity: 0.42 });
    for (let x = -4; x <= 4; x += 2) this.box(this.staticGroup, x, 0.055, 0.5, 0.05, 0.04, 8.3, grid);
    for (let z = -3; z <= 4; z += 2) this.box(this.staticGroup, 0, 0.06, z, 8.8, 0.04, 0.05, grid);
  }

  private utilityStaging(x: number, z: number): void {
    this.worktable(x, z, '#d9bd89');
    this.crates(x + 1.0, z + 0.35);
    this.barrel(x - 1.0, z + 0.2);
    this.box(this.staticGroup, x - 0.35, 0.8, z - 0.16, 0.42, 0.08, 0.28, this.mats.get('plot-tool-head', '#aeb4ad', { metalness: 0.25 }), { ry: -0.2 });
    this.box(this.staticGroup, x + 0.34, 0.84, z + 0.08, 0.16, 0.34, 0.12, this.mats.get('plot-hammer', '#5a3920'), { rz: 0.35 });
  }

  private buildGhostMarker(x: number, z: number): void {
    const valid = this.mats.get('build-ghost-valid', '#8ee0a1', { transparent: true, opacity: 0.48 });
    const edge = this.mats.get('build-ghost-edge', '#e6f7cc', { transparent: true, opacity: 0.72 });
    this.box(this.staticGroup, x, 0.09, z, 1.4, 0.08, 1.4, valid);
    this.box(this.staticGroup, x, 0.18, z - 0.72, 1.48, 0.1, 0.08, edge);
    this.box(this.staticGroup, x, 0.18, z + 0.72, 1.48, 0.1, 0.08, edge);
    this.box(this.staticGroup, x - 0.72, 0.18, z, 0.08, 0.1, 1.48, edge);
    this.box(this.staticGroup, x + 0.72, 0.18, z, 0.08, 0.1, 1.48, edge);
  }

  private makeEntity(entity: Entity): THREE.Group {
    if (entity.kind === 'npc' || entity.kind === 'social') {
      const socialPalette = ['#345d45', '#294b6f', '#5a3d72', '#6a5130', '#2d5b64'];
      const socialIndex = entity.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % socialPalette.length;
      const palette = entity.role === 'banker'
        ? ['#4c2d1b', '#1e2d3a']
        : entity.role === 'blacksmith'
          ? ['#7d4221', '#6f553d']
          : entity.role === 'merchant'
            ? ['#74412b', '#294b6f']
            : entity.role === 'guard'
              ? ['#2b241e', '#314b67']
              : ['#4b3426', socialPalette[socialIndex]];
      return this.makeCharacter(palette[0], palette[1], '#d9d2bf');
    }
    if (entity.kind === 'enemy') {
      if (entity.enemyType === 'Undead') return this.makeSkeleton();
      if (entity.enemyType === 'Beast') return this.makeWolf();
      if (entity.enemyType === 'Cultist') return this.makeCharacter('#181218', '#42215a', '#7ad7ff');
      if (entity.aiStyle === 'archer') return this.makeCharacter('#2d1913', '#3f3a29', '#d19a54');
      return this.makeCharacter('#3b2119', '#4a2d24', '#b76535');
    }
    if (entity.kind === 'resource') {
      if (entity.resourceType === 'tree') return this.makeTreeEntity(entity);
      if (entity.resourceType === 'herb') return this.makeHerbEntity();
      return this.makeOreEntity(entity.yieldItemId === 'copper_ore' ? '#b77745' : '#9ba5a3');
    }
    if (entity.kind === 'loot') {
      const group = new THREE.Group();
      if (entity.gold) {
        this.box(group, 0, 0.12, 0, 0.22, 0.12, 0.22, this.mats.get('gold', '#e7b52e', { metalness: 0.5 }));
        this.box(group, 0.18, 0.16, 0.05, 0.18, 0.1, 0.18, this.mats.get('gold2', '#f2ca45', { metalness: 0.5 }));
      } else {
        this.iconVoxel(group, itemDefs[entity.item?.itemId ?? 'stone_block']?.icon ?? itemDefs.stone_block.icon, 0, 0.2, 0);
      }
      return group;
    }
    if (entity.kind === 'container') {
      if (entity.name.includes('Board')) return this.makeNoticeBoard(entity.name.includes('Market') ? '#2f5d93' : '#7a4a24');
      return this.kit.chestBuilder({ locked: entity.locked, trapped: Boolean(entity.trap?.armed), colorVariation: 0.04 });
    }
    if (entity.kind === 'portal') {
      const group = new THREE.Group();
      this.box(group, 0, 0.05, 0, 0.8, 0.1, 0.8, this.mats.get('portal', '#2b74b8', { emissive: '#113b6a', emissiveIntensity: 0.35 }));
      return group;
    }
    return new THREE.Group();
  }

  private makeNoticeBoard(accent: string): THREE.Group {
    const group = new THREE.Group();
    const post = this.mats.get('notice-board-post', '#5f3b20');
    const face = this.mats.get(`notice-board-face-${accent}`, '#7c5834');
    const trim = this.mats.get(`notice-board-trim-${accent}`, accent, { emissive: accent, emissiveIntensity: 0.08 });
    const paper = this.mats.get('notice-board-paper', '#d8c7a0');
    this.box(group, -0.46, 0.62, 0, 0.13, 1.24, 0.13, post);
    this.box(group, 0.46, 0.62, 0, 0.13, 1.24, 0.13, post);
    this.box(group, 0, 1.08, -0.03, 1.26, 0.74, 0.12, face);
    this.box(group, 0, 1.5, -0.04, 1.36, 0.12, 0.14, trim);
    this.box(group, 0, 0.66, -0.04, 1.36, 0.1, 0.14, trim);
    this.box(group, -0.28, 1.16, -0.11, 0.36, 0.3, 0.04, paper);
    this.box(group, 0.24, 1.08, -0.11, 0.42, 0.26, 0.04, paper);
    this.box(group, 0.04, 0.88, -0.12, 0.5, 0.06, 0.04, trim);
    this.box(group, 0, 0.08, 0, 1.34, 0.08, 0.44, this.mats.get('notice-board-base', '#4a3424'));
    return group;
  }

  private updatePlayerEquipmentVisuals(player: THREE.Group, state: GameState): void {
    const visuals = resolveEquipmentVisuals(state).filter((visual) => visual.showInWorld);
    const key = visuals.map((visual) => [
      visual.itemId ?? '',
      visual.equipmentSlot,
      visual.visualPrefabId,
      visual.attachPoint,
      visual.heldPose,
      visual.color,
      visual.actionVisual ?? ''
    ].join(':')).join('|');
    const existing = player.getObjectByName('equipment-visuals');
    if (player.userData.equipmentVisualKey === key && existing) return;
    player.userData.equipmentVisualKey = key;

    if (existing) {
      player.remove(existing);
      this.disposeObject(existing);
    }

    const equipmentGroup = new THREE.Group();
    equipmentGroup.name = 'equipment-visuals';
    visuals.forEach((visual) => this.addEquipmentVisual(equipmentGroup, visual));
    player.add(equipmentGroup);
  }

  private addEquipmentVisual(parent: THREE.Group, visual: EquipmentVisualContract): void {
    const attach = characterAttachPoints[visual.attachPoint];
    const holder = new THREE.Group();
    holder.name = this.equipmentObjectName(visual);
    holder.userData.actionVisual = visual.actionVisual;
    holder.userData.visualPrefabId = visual.visualPrefabId;
    holder.position.set(attach.x + visual.offset.x, attach.y + visual.offset.y, attach.z + visual.offset.z);
    holder.rotation.set(visual.rotation.x, visual.rotation.y, visual.rotation.z);
    holder.scale.setScalar(visual.scale);
    parent.add(holder);
    this.buildEquipmentPrefab(holder, visual);
  }

  private equipmentObjectName(visual: EquipmentVisualContract): string {
    if ((visual.equipmentSlot === 'weapon' || visual.equipmentSlot === 'action') && visual.attachPoint === 'rightHand') return 'weapon';
    if (visual.equipmentSlot === 'shield') return 'shield';
    return `equipment-${visual.visualPrefabId.replace(/[^a-z0-9]+/gi, '-')}`;
  }

  private buildEquipmentPrefab(parent: THREE.Group, visual: EquipmentVisualContract): void {
    const color = visual.color;
    const metal = this.mats.get(`gear-metal-${color}`, color, { metalness: visual.materialVariant === 'iron' ? 0.45 : 0.12 });
    const wood = this.mats.get(`gear-wood-${color}`, color);
    const dark = this.mats.get('gear-dark', '#2b1a12');
    const cloth = this.mats.get(`gear-cloth-${color}`, color, { roughness: 0.8 });
    const magic = this.mats.get(`gear-magic-${color}`, color, { emissive: color, emissiveIntensity: visual.materialVariant === 'fire' ? 1.3 : 0.75, transparent: true, opacity: 0.78 });

    if (visual.visualPrefabId === 'weapon:sword' || visual.visualPrefabId === 'weapon:staff') {
      const shaftMat = visual.visualPrefabId === 'weapon:staff' ? wood : metal;
      this.box(parent, 0, 0.24, 0, 0.1, 0.76, 0.08, shaftMat, { rz: -0.04 });
      this.box(parent, 0, -0.2, 0, 0.18, 0.12, 0.1, dark);
      if (visual.visualPrefabId === 'weapon:staff') this.box(parent, 0, 0.68, 0, 0.2, 0.18, 0.2, magic);
      return;
    }

    if (visual.visualPrefabId === 'weapon:bow') {
      this.box(parent, -0.03, 0.16, 0, 0.08, 0.78, 0.08, wood, { rz: -0.18 });
      this.box(parent, 0.1, 0.16, 0, 0.04, 0.7, 0.04, this.mats.get('gear-bow-string', '#e8dcc0'), { rz: 0.18 });
      this.box(parent, 0.22, 0.18, 0, 0.52, 0.05, 0.05, this.mats.get('gear-arrow', '#d9bf77'), { rz: 0.02 });
      return;
    }

    if (visual.visualPrefabId === 'tool:axe' || visual.visualPrefabId === 'tool:pickaxe') {
      this.box(parent, 0, 0.08, 0, 0.09, 0.7, 0.08, dark, { rz: -0.04 });
      const headWidth = visual.visualPrefabId === 'tool:pickaxe' ? 0.42 : 0.3;
      this.box(parent, -0.02, 0.44, 0, headWidth, 0.12, 0.1, metal, { rz: visual.visualPrefabId === 'tool:pickaxe' ? 0 : 0.2 });
      return;
    }

    if (visual.visualPrefabId === 'tool:torch') {
      this.box(parent, 0, 0.06, 0, 0.1, 0.58, 0.1, dark);
      this.box(parent, 0, 0.42, 0, 0.2, 0.18, 0.2, magic);
      return;
    }

    if (visual.visualPrefabId === 'shield:round') {
      this.box(parent, 0, 0, 0, 0.12, 0.46, 0.36, metal);
      this.box(parent, -0.07, 0, -0.01, 0.08, 0.28, 0.2, dark);
      return;
    }

    if (visual.visualPrefabId.startsWith('armor:')) {
      if (visual.visualPrefabId === 'armor:helmet') {
        this.box(parent, 0, 0, -0.02, 0.48, 0.18, 0.42, metal);
        this.box(parent, 0, -0.08, -0.22, 0.32, 0.08, 0.08, dark);
        return;
      }
      if (visual.visualPrefabId === 'armor:boots') {
        this.box(parent, -0.15, 0, 0, 0.2, 0.16, 0.28, metal);
        this.box(parent, 0.15, 0, 0, 0.2, 0.16, 0.28, metal);
        return;
      }
      const mat = visual.materialVariant === 'cloth' ? cloth : metal;
      this.box(parent, 0, 0, -0.03, 0.56, 0.54, 0.12, mat);
      this.box(parent, -0.22, 0.02, -0.02, 0.08, 0.4, 0.1, mat);
      this.box(parent, 0.22, 0.02, -0.02, 0.08, 0.4, 0.1, mat);
      return;
    }

    if (visual.visualPrefabId === 'pack:backpack') {
      this.box(parent, 0, 0, 0, 0.42, 0.56, 0.16, wood);
      this.box(parent, 0, 0.17, -0.08, 0.3, 0.08, 0.06, dark);
      return;
    }

    if (visual.visualPrefabId === 'ammo:quiver') {
      this.box(parent, 0, 0, 0, 0.16, 0.52, 0.14, dark, { rz: -0.18 });
      for (let i = 0; i < 3; i += 1) this.box(parent, -0.04 + i * 0.04, 0.33, -0.02, 0.03, 0.28, 0.03, metal, { rz: -0.18 });
      return;
    }

    if (visual.visualPrefabId === 'tool:bandage-wrap') {
      this.box(parent, 0, 0, 0, 0.22, 0.12, 0.16, cloth);
      this.box(parent, 0.02, 0.07, 0, 0.24, 0.04, 0.18, this.mats.get('bandage-shadow', '#b8a88c'));
      return;
    }

    if (visual.visualPrefabId.startsWith('effect:')) {
      this.box(parent, 0, 0, 0, 0.18, 0.18, 0.18, magic);
      return;
    }

    this.box(parent, 0, 0, 0, 0.18, 0.18, 0.18, wood);
  }

  private makePlayerCharacter(): THREE.Group {
    const group = this.makeCharacter('#6d4a2c', '#2f5841', '#d0d0c8', false);
    group.name = 'player-character';
    group.userData.playerHeroModelStatus = 'fallback';
    void this.loadPlayerHeroModel().then((model) => {
      if (!model || group.userData.playerHeroModelStatus === 'runtime-model') return;
      const entityId = group.userData.entityId;
      const runtimeModel = this.cloneRuntimeModel(model);
      runtimeModel.name = 'player-hero-runtime-model';
      runtimeModel.rotation.y = PLAYER_HERO_MODEL_YAW_OFFSET;
      runtimeModel.traverse((child) => {
        child.userData.entityId = entityId;
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.runtimeAssetMesh = true;
        }
      });
      this.clearGroup(group);
      group.add(runtimeModel);
      group.userData.playerHeroModelStatus = 'runtime-model';
      group.userData.equipmentVisualKey = null;
      this.markPrimaryPickTargets(group);
    });
    return group;
  }

  private loadPlayerHeroModel(): Promise<THREE.Object3D | null> {
    if (!this.playerHeroModelPromise) {
      this.playerHeroModelPromise = import('three/examples/jsm/loaders/GLTFLoader.js')
        .then(({ GLTFLoader }) => new GLTFLoader().loadAsync(PLAYER_HERO_MODEL_URL))
        .then((gltf) => {
          gltf.scene.name = 'player-hero-template';
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          return gltf.scene;
        })
        .catch(() => null);
    }
    return this.playerHeroModelPromise;
  }

  private cloneRuntimeModel(model: THREE.Object3D): THREE.Object3D {
    const clone = model.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry = child.geometry.clone();
      child.geometry.userData.runtimeAssetGeometry = true;
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => {
            const cloned = material.clone();
            cloned.userData.runtimeAssetMaterial = true;
            return cloned;
          })
        : child.material.clone();
      if (!Array.isArray(child.material)) child.material.userData.runtimeAssetMaterial = true;
    });
    return clone;
  }

  private animatePlayerEquipmentVisuals(player: THREE.Group, state: GameState): void {
    const equipmentGroup = player.getObjectByName('equipment-visuals');
    if (!equipmentGroup) return;
    const action = state.player.actionState;
    const actionProgress = Math.max(0, Math.min(1, (state.clock - action.startedAt) / Math.max(0.1, action.duration || 0.1)));
    const activeFrame = Math.sin(actionProgress * Math.PI);
    equipmentGroup.children.forEach((child) => {
      const actionVisual = child.userData.actionVisual as EquipmentVisualContract['actionVisual'] | undefined;
      if (!actionVisual) return;
      const wave = Math.sin(state.clock * 11);
      if (actionVisual === 'tool-swing' && action.kind === 'gathering') child.rotation.z = -1.05 + activeFrame * 0.68;
      if (actionVisual === 'bow-draw' && action.kind === 'attacking') child.scale.set(1 + Math.min(0.18, actionProgress * 0.22), 1, 1);
      if (actionVisual === 'spell-windup') child.scale.setScalar(1 + (state.spellCasting ? 0.12 + actionProgress * 0.2 : Math.abs(Math.sin(state.clock * 8)) * 0.14));
      if (actionVisual === 'bandage-wrap') child.rotation.z = action.kind === 'interacting' ? -0.18 + activeFrame * 0.36 : wave * 0.08;
      if (actionVisual === 'shield-block') child.scale.setScalar(1 + (state.combat.defenseUntil >= state.clock ? activeFrame * 0.22 : Math.abs(wave) * 0.06));
      if (actionVisual === 'broken-spark') child.scale.setScalar(0.7 + Math.abs(wave) * 0.45);
    });
  }

  private makeCharacter(hair: string, tunic: string, metal: string, includeStarterWeapon = true): THREE.Group {
    const g = new THREE.Group();
    g.userData.actor = true;
    this.box(g, 0, 0.35, 0, 0.48, 0.7, 0.34, this.mats.get(`tunic-${tunic}`, tunic));
    this.box(g, 0, 0.9, 0, 0.42, 0.42, 0.38, this.mats.get('skin', '#c48755'));
    this.box(g, 0, 1.16, -0.04, 0.46, 0.22, 0.42, this.mats.get(`hair-${hair}`, hair));
    this.box(g, -0.32, 0.4, 0, 0.16, 0.52, 0.18, this.mats.get(`sleeve-${tunic}`, tunic)).name = 'left-arm';
    this.box(g, 0.32, 0.4, 0, 0.16, 0.52, 0.18, this.mats.get(`sleeve2-${tunic}`, tunic)).name = 'right-arm';
    this.box(g, -0.14, -0.1, 0, 0.18, 0.42, 0.18, this.mats.get('pants', '#2d251e')).name = 'left-leg';
    this.box(g, 0.14, -0.1, 0, 0.18, 0.42, 0.18, this.mats.get('pants2', '#2d251e')).name = 'right-leg';
    if (includeStarterWeapon) {
      this.box(g, 0.5, 0.35, -0.12, 0.12, 0.92, 0.08, this.mats.get(`weapon-${metal}`, metal, { metalness: 0.25 }), { rz: -0.6 }).name = 'weapon';
    }
    this.box(g, 0, 0.1, -0.2, 0.54, 0.12, 0.14, this.mats.get('belt', '#2b1a12'));
    return g;
  }

  private makeSkeleton(): THREE.Group {
    const g = new THREE.Group();
    g.userData.actor = true;
    const bone = this.mats.get('bone', '#c9c5b4');
    this.box(g, 0, 0.34, 0, 0.35, 0.64, 0.25, bone);
    this.box(g, 0, 0.9, 0, 0.42, 0.36, 0.36, bone);
    this.box(g, -0.08, 0.94, -0.19, 0.08, 0.08, 0.06, this.mats.get('skel-eye', '#e23a31', { emissive: '#d71919', emissiveIntensity: 0.65 }));
    this.box(g, 0.08, 0.94, -0.19, 0.08, 0.08, 0.06, this.mats.get('skel-eye2', '#e23a31', { emissive: '#d71919', emissiveIntensity: 0.65 }));
    this.box(g, -0.28, 0.35, 0, 0.12, 0.6, 0.12, bone).name = 'left-arm';
    this.box(g, 0.28, 0.35, 0, 0.12, 0.6, 0.12, bone).name = 'right-arm';
    this.box(g, -0.12, -0.12, 0, 0.1, 0.42, 0.1, bone).name = 'left-leg';
    this.box(g, 0.12, -0.12, 0, 0.1, 0.42, 0.1, bone).name = 'right-leg';
    this.box(g, 0.44, 0.35, -0.1, 0.1, 0.86, 0.08, this.mats.get('rust', '#7d6b5b', { metalness: 0.2 }), { rz: -0.7 }).name = 'weapon';
    this.box(g, -0.34, 0.4, 0.15, 0.16, 0.42, 0.34, this.mats.get('shield-wood', '#6a4a2e'));
    return g;
  }

  private makeWolf(): THREE.Group {
    const g = new THREE.Group();
    g.userData.actor = true;
    const fur = this.mats.get('wolf-fur', '#50524c');
    const dark = this.mats.get('wolf-dark', '#2a2b28');
    this.box(g, 0, 0.3, 0, 0.85, 0.42, 0.34, fur);
    this.box(g, 0.48, 0.42, -0.02, 0.36, 0.3, 0.3, fur);
    this.box(g, 0.67, 0.43, -0.12, 0.12, 0.1, 0.08, this.mats.get('wolf-eye', '#f0d05a', { emissive: '#e7b84c', emissiveIntensity: 0.3 }));
    this.box(g, -0.55, 0.38, 0, 0.5, 0.16, 0.16, dark, { rz: -0.2 });
    this.box(g, -0.28, 0.02, -0.12, 0.12, 0.38, 0.1, dark).name = 'left-leg';
    this.box(g, 0.2, 0.02, -0.12, 0.12, 0.38, 0.1, dark).name = 'right-leg';
    this.box(g, -0.28, 0.02, 0.12, 0.12, 0.38, 0.1, dark).name = 'left-arm';
    this.box(g, 0.2, 0.02, 0.12, 0.12, 0.38, 0.1, dark).name = 'right-arm';
    return g;
  }

  private makeTreeEntity(entity: Extract<Entity, { kind: 'resource' }>): THREE.Group {
    if (entity.depleted) {
      const g = new THREE.Group();
      const stump = this.mats.get('tree-stump', '#674222');
      const top = this.mats.get('tree-stump-top', '#9a7040');
      const cut = this.mats.get('tree-cut-mark', '#d0a46a');
      this.box(g, 0, 0.28, 0, 0.58, 0.56, 0.58, stump);
      this.box(g, 0, 0.59, 0, 0.5, 0.06, 0.5, top);
      this.box(g, -0.12, 0.64, 0.05, 0.3, 0.025, 0.06, cut, { ry: 0.35 });
      this.box(g, 0.62, 0.15, 0.2, 0.7, 0.18, 0.18, stump, { ry: 0.45 });
      return g;
    }
    const size = entity.area === 'town' ? 0.74 + ((entity.visualVariant ?? 0) % 3) * 0.08 : entity.area === 'road' ? 0.8 : 1;
    const group = this.kit.treeBuilder({ size, seed: (entity.visualVariant ?? 0) + entity.id.length, props: true, colorVariation: 0.08 });
    if (entity.protected) {
      this.box(group, 0, 0.72, 0.24, 0.52, 0.08, 0.08, this.mats.get('protected-tree-ribbon', '#f0c957'));
    }
    return group;
  }

  private makeOreEntity(color: string): THREE.Group {
    return this.kit.oreVeinBuilder({ color, colorVariation: 0.06 });
  }

  private makeHerbEntity(): THREE.Group {
    const g = new THREE.Group();
    this.box(g, 0, 0.08, 0, 0.7, 0.08, 0.7, this.mats.get('herb-soil', '#4c3d25'));
    this.box(g, -0.16, 0.26, 0.08, 0.16, 0.42, 0.14, this.mats.get('herb-leaf', '#6fb447'));
    this.box(g, 0.12, 0.24, -0.1, 0.14, 0.38, 0.14, this.mats.get('herb-leaf2', '#83c954'));
    this.box(g, 0.28, 0.2, 0.18, 0.1, 0.28, 0.1, this.mats.get('herb-flower', '#d9d2a1'));
    return g;
  }

  private makeBuildPiece(pieceId: string, ghost: boolean, ghostColor = '#60d871'): THREE.Group {
    const piece = buildPieces.find((candidate) => candidate.id === pieceId) ?? buildPieces[0];
    const g = new THREE.Group();
    const mat = ghost
      ? this.mats.get(`ghost-${ghostColor}`, ghostColor, { transparent: true, opacity: 0.42, emissive: ghostColor, emissiveIntensity: 0.1 })
      : this.materialForBuildPiece(piece);
    if (piece.id === 'half_wall') {
      this.box(g, 0, 0.28, 0, 1, 0.56, 0.32, mat);
    } else if (piece.id === 'window_wall') {
      this.box(g, -0.38, 0.55, 0, 0.22, 1.1, 0.32, mat);
      this.box(g, 0.38, 0.55, 0, 0.22, 1.1, 0.32, mat);
      this.box(g, 0, 1.04, 0, 1, 0.22, 0.32, mat);
      this.box(g, 0, 0.18, 0, 1, 0.28, 0.32, mat);
    } else if (piece.id.includes('wall')) {
      this.box(g, 0, 0.55, 0, 1, 1.1, 0.32, mat);
    } else if (piece.id === 'floor' || piece.id === 'stone_floor') {
      this.box(g, 0, 0.08, 0, 1, 0.16, 1, mat);
    } else if (piece.id === 'fence') {
      if (ghost) {
        this.box(g, 0, 0.35, -0.35, 0.16, 0.7, 0.16, mat);
        this.box(g, 0, 0.35, 0.35, 0.16, 0.7, 0.16, mat);
        this.box(g, 0, 0.55, 0, 1, 0.16, 0.14, mat);
      } else {
        g.add(this.kit.fenceBuilder({ colorVariation: 0.04 }));
      }
    } else if (piece.id === 'door') {
      this.box(g, 0, 0.55, 0, 0.74, 1.1, 0.12, mat);
      this.box(g, 0.24, 0.62, -0.08, 0.08, 0.08, 0.08, this.mats.get('door-knob', '#d9b25c'));
    } else if (piece.id === 'roof') {
      this.box(g, 0, 0.45, 0, 1.1, 0.42, 1.1, mat, { ry: Math.PI / 4 });
    } else if (piece.id === 'torch') {
      this.torchPost(0, 0, g);
    } else if (piece.id === 'small_chest') {
      if (ghost) this.box(g, 0, 0.32, 0, 0.8, 0.58, 0.62, mat);
      else g.add(this.kit.chestBuilder({ seed: this.tileHash(piece.id.length, 2), colorVariation: 0.04 }));
    } else if (piece.id === 'resource_crate' || piece.id === 'crate') {
      this.box(g, 0, 0.35, 0, 0.82, 0.7, 0.82, mat);
      this.box(g, 0, 0.72, 0, 0.94, 0.08, 0.94, ghost ? mat : this.mats.get('crate-lip', '#4f3321'));
    } else if (piece.id === 'reagent_shelf') {
      this.box(g, 0, 0.75, 0, 0.95, 1.3, 0.18, mat);
      this.box(g, -0.28, 1.12, -0.16, 0.16, 0.28, 0.16, ghost ? mat : this.mats.get('reagent-red', '#cf2d35', { emissive: '#cf2d35', emissiveIntensity: 0.25 }));
      this.box(g, 0.02, 1.0, -0.16, 0.16, 0.28, 0.16, ghost ? mat : this.mats.get('reagent-green', '#67c56b', { emissive: '#67c56b', emissiveIntensity: 0.2 }));
      this.box(g, 0.32, 0.88, -0.16, 0.16, 0.28, 0.16, ghost ? mat : this.mats.get('reagent-blue', '#245ee9', { emissive: '#245ee9', emissiveIntensity: 0.2 }));
    } else if (piece.id === 'weapon_rack') {
      this.box(g, 0, 0.9, 0, 1.15, 0.16, 0.16, mat);
      this.box(g, -0.34, 0.54, 0, 0.09, 0.78, 0.09, ghost ? mat : this.mats.get('rack-metal', '#a7aaa7'), { rz: 0.45 });
      this.box(g, 0.34, 0.54, 0, 0.09, 0.78, 0.09, ghost ? mat : this.mats.get('rack-metal2', '#a7aaa7'), { rz: -0.45 });
    } else if (piece.id === 'armor_stand') {
      this.box(g, 0, 0.68, 0, 0.18, 1.15, 0.18, mat);
      this.box(g, 0, 1.02, 0, 0.68, 0.5, 0.28, ghost ? mat : this.mats.get('stand-armor', '#8b4f2c'));
      this.box(g, 0, 0.16, 0, 0.9, 0.12, 0.5, mat);
    } else if (piece.id === 'basic_workbench' || piece.id === 'carpenter_bench_home' || piece.id === 'repair_station_home') {
      this.box(g, 0, 0.42, 0, 1.55, 0.28, 0.9, mat);
      this.box(g, -0.52, 0.18, -0.28, 0.16, 0.36, 0.16, mat);
      this.box(g, 0.52, 0.18, 0.28, 0.16, 0.36, 0.16, mat);
      this.box(g, 0.18, 0.68, 0, 0.58, 0.08, 0.18, ghost ? mat : this.mats.get('bench-tool', piece.id === 'repair_station_home' ? '#a7aaa7' : '#d9bd89'));
    } else if (piece.id === 'small_forge_home') {
      if (ghost) {
        this.box(g, -0.25, 0.42, 0, 0.8, 0.72, 0.76, mat);
        this.box(g, 0.42, 0.25, 0.12, 0.5, 0.28, 0.38, mat);
      } else {
        const forge = this.kit.forgeBuilder({ seed: 7, colorVariation: 0.035, props: true });
        forge.scale.setScalar(0.78);
        forge.position.x = -0.22;
        g.add(forge);
        this.box(g, 0.5, 0.25, 0.08, 0.52, 0.18, 0.32, this.mats.get('home-anvil', '#777c80', { metalness: 0.25 }));
      }
    } else if (piece.id === 'alchemy_table_home') {
      this.box(g, 0, 0.42, 0, 1.4, 0.28, 0.82, mat);
      this.box(g, -0.3, 0.72, 0, 0.2, 0.28, 0.2, ghost ? mat : this.mats.get('alchemy-home-red', '#cf2d35', { emissive: '#cf2d35', emissiveIntensity: 0.25 }));
      this.box(g, 0.3, 0.72, 0.1, 0.2, 0.28, 0.2, ghost ? mat : this.mats.get('alchemy-home-blue', '#245ee9', { emissive: '#245ee9', emissiveIntensity: 0.25 }));
    } else if (piece.id === 'scribe_desk_home' || piece.id === 'notice_board_home' || piece.id === 'sign_home') {
      this.box(g, 0, 0.72, 0, piece.id === 'notice_board_home' ? 1.05 : 0.85, piece.id === 'notice_board_home' ? 0.75 : 0.48, 0.12, mat);
      this.box(g, -0.38, 0.35, 0.02, 0.12, 0.7, 0.12, mat);
      this.box(g, 0.38, 0.35, 0.02, 0.12, 0.7, 0.12, mat);
      if (piece.id === 'scribe_desk_home') this.box(g, 0, 0.98, -0.08, 0.5, 0.04, 0.34, ghost ? mat : this.mats.get('scribe-home-scroll', '#d9bd89'));
    } else if (piece.id === 'cooking_hearth_home' || piece.id === 'campfire_home') {
      this.box(g, 0, 0.14, 0, 1.0, 0.22, 1.0, ghost ? mat : this.mats.get('home-hearth-stone', '#55524d'));
      this.box(g, 0, 0.36, 0, 0.44, 0.36, 0.44, ghost ? mat : this.mats.get('home-hearth-fire', '#ff8a2e', { emissive: '#ff5c1f', emissiveIntensity: 1.2 }));
      if (piece.id === 'cooking_hearth_home') this.box(g, 0, 0.78, 0, 0.65, 0.12, 0.65, ghost ? mat : this.mats.get('home-pot', '#343434', { metalness: 0.35 }));
    } else if (piece.id === 'bedroll_home' || piece.id === 'rug_home') {
      this.box(g, 0, 0.07, 0, piece.id === 'rug_home' ? 1.35 : 1.45, 0.08, 0.78, mat);
      this.box(g, -0.42, 0.12, -0.16, 0.28, 0.08, 0.46, ghost ? mat : this.mats.get('bedroll-roll', '#d8d5c9'));
    } else if (piece.id === 'home_marker') {
      this.box(g, 0, 0.12, 0, 0.65, 0.18, 0.65, mat);
      this.box(g, 0, 0.48, 0, 0.22, 0.62, 0.22, ghost ? mat : this.mats.get('home-marker-glow', '#6fd4ff', { emissive: '#6fd4ff', emissiveIntensity: 0.85 }));
    } else if (piece.id === 'training_dummy_home') {
      this.box(g, 0, 0.58, 0, 0.18, 1.1, 0.18, mat);
      this.box(g, 0, 0.98, 0, 0.62, 0.44, 0.28, ghost ? mat : this.mats.get('dummy-cloth', '#c9b28a'));
      this.box(g, 0, 0.18, 0, 0.78, 0.12, 0.44, mat);
    } else if (piece.id === 'lamp_post_home') {
      if (ghost) this.box(g, 0, 0.72, 0, 0.18, 1.45, 0.18, mat);
      else g.add(this.kit.lampPostBuilder({ size: 0.78, seed: 9, color: '#ffbd55' }));
    } else if (piece.id === 'herb_planter_home' || piece.id === 'garden_patch_home' || piece.id === 'plant_pot_home') {
      this.box(g, 0, 0.12, 0, 0.82, 0.18, 0.82, ghost ? mat : this.mats.get('planter-soil', '#4c3d25'));
      this.box(g, -0.2, 0.34, 0.05, 0.14, 0.42, 0.12, ghost ? mat : this.mats.get('planter-leaf', '#67c56b'));
      this.box(g, 0.18, 0.3, -0.12, 0.12, 0.34, 0.12, ghost ? mat : this.mats.get('planter-leaf2', '#83c954'));
      if (piece.id === 'garden_patch_home') this.box(g, 0.22, 0.27, 0.18, 0.12, 0.18, 0.12, ghost ? mat : this.mats.get('carrot-top', '#d9822f'));
    } else if (piece.id === 'skull_trophy_home') {
      this.box(g, 0, 0.18, 0, 0.5, 0.12, 0.5, mat);
      this.box(g, 0, 0.5, 0, 0.36, 0.34, 0.32, ghost ? mat : this.mats.get('skull-bone', '#d8d5c9'));
    } else if (piece.id === 'bandit_banner_home' || piece.id === 'wall_tapestry_home') {
      if (ghost) this.box(g, 0, 0.78, 0, 0.9, 0.85, 0.08, mat);
      else g.add(this.kit.bannerBuilder({ seed: piece.id === 'bandit_banner_home' ? 12 : 14, color: piece.id === 'bandit_banner_home' ? '#8f1f2d' : '#1f5a95', colorVariation: 0.035 }));
    } else if (piece.id === 'ore_sample_display') {
      this.box(g, 0, 0.22, 0, 0.72, 0.18, 0.52, mat);
      this.box(g, -0.18, 0.48, 0.02, 0.22, 0.22, 0.22, ghost ? mat : this.mats.get('ore-sample-copper', '#bf7443'));
      this.box(g, 0.18, 0.44, -0.04, 0.18, 0.18, 0.18, ghost ? mat : this.mats.get('ore-sample-iron', '#a8b1b0'));
    } else if (piece.id === 'treasure_map_display') {
      this.box(g, 0, 0.64, 0, 0.85, 0.68, 0.1, mat);
      this.box(g, 0, 0.66, -0.06, 0.54, 0.44, 0.04, ghost ? mat : this.mats.get('map-display-paper', '#d7bf8d'));
    } else if (piece.id === 'barrel') {
      this.box(g, 0, 0.35, 0, 0.7, 0.68, 0.7, mat);
      this.box(g, 0, 0.15, 0, 0.78, 0.1, 0.78, this.mats.get('barrel-band', '#4f3321'));
      this.box(g, 0, 0.58, 0, 0.78, 0.1, 0.78, this.mats.get('barrel-band2', '#4f3321'));
    } else {
      this.box(g, 0, 0.35, 0, 0.8, 0.7, 0.8, mat);
    }
    return g;
  }

  private materialForBuildPiece(piece: BuildPieceDef): THREE.Material {
    if (piece.id === 'half_wall') return this.mats.get('placed-stone', '#77756e');
    if (piece.id.includes('stone')) return this.mats.get('placed-stone', '#77756e');
    if (piece.id.includes('roof')) return this.mats.get('placed-roof', '#784019');
    if (piece.id === 'door') return this.mats.get('placed-door', '#75451f');
    if (piece.id === 'barrel') return this.mats.get('placed-barrel', '#7d4a24');
    return this.mats.get('placed-wood', '#86552b');
  }

  private makeVisualEffect(effect: VisualEffect, clock: number): THREE.Object3D {
    const t = Math.max(0, Math.min(1, (clock - effect.startedAt) / Math.max(0.01, effect.duration)));
    const fade = Math.max(0.12, Math.round((1 - t) * 10) / 10);
    const group = new THREE.Group();
    group.position.set(effect.position.x, effect.position.y, effect.position.z);
    if (effect.yaw !== undefined) group.rotation.y = effect.yaw;
    const material = (name: string, color = effect.color, opacity = fade, emissiveIntensity = 0.6) =>
      this.mats.get(`vfx-${name}`, color, { transparent: true, opacity, emissive: color, emissiveIntensity, depthWrite: false, side: THREE.DoubleSide });
    const groundRing = (inner: number, outer: number, color = effect.color, opacity = fade) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 32), material(`${effect.kind}-ring-${Math.round(opacity * 10)}`, color, opacity));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.07;
      group.add(ring);
    };
    const lineToTarget = (thickness: number, color = effect.color) => {
      if (!effect.targetPosition) return;
      const dx = effect.targetPosition.x - effect.position.x;
      const dz = effect.targetPosition.z - effect.position.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.05) return;
      const midX = dx * 0.5;
      const midZ = dz * 0.5;
      const yaw = Math.atan2(dx, dz);
      this.box(group, midX, 0.55, midZ, thickness, thickness, length, material(`${effect.kind}-line`, color, 0.45), { ry: yaw });
    };

    switch (effect.kind) {
      case 'slash_arc': {
        const arc = new THREE.Mesh(new THREE.RingGeometry(0.6 + t * 0.08, 0.68 + t * 0.1, 28, 1, -0.65, Math.PI * 0.82), material('slash-arc', effect.color, fade * 0.55, 0.7));
        arc.position.set(0, 0.8, 0.7);
        arc.rotation.z = -0.35 + t * 0.9;
        group.add(arc);
        break;
      }
      case 'pierce_thrust':
        this.box(group, 0, 0.72, 0.45 + t * 0.58, 0.08, 0.08, 0.95, material('pierce-thrust', effect.color, fade * 0.65), { ry: 0 });
        break;
      case 'mace_impact':
      case 'hit_impact':
      case 'armor_sparks':
        for (let i = 0; i < 5; i += 1) {
          const angle = i * 1.256 + t * 1.4;
          const radius = 0.12 + t * (effect.kind === 'mace_impact' ? 0.48 : 0.34);
          this.box(group, Math.cos(angle) * radius, 0.72 + Math.sin(i) * 0.12, Math.sin(angle) * radius, effect.kind === 'mace_impact' ? 0.16 : 0.08, 0.08, effect.kind === 'armor_sparks' ? 0.2 : 0.08, material(effect.kind, effect.color, fade * 0.7, 0.85));
        }
        break;
      case 'shield_block': {
        const shield = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.56 + t * 0.16, 6), material('shield-block', effect.color, fade * 0.62, 0.85));
        shield.position.set(0, 0.72, 0.42);
        shield.rotation.z = Math.PI / 6;
        group.add(shield);
        break;
      }
      case 'dodge_cue':
      case 'miss_cue':
        groundRing(0.24 + t * 0.18, 0.32 + t * 0.2, effect.color, fade * 0.45);
        this.box(group, 0, 0.42, 0, 0.52, 0.05, 0.05, material(effect.kind, effect.color, fade * 0.62), { ry: Math.PI / 4 });
        this.box(group, 0, 0.42, 0, 0.05, 0.05, 0.52, material(`${effect.kind}-cross`, effect.color, fade * 0.62), { ry: Math.PI / 4 });
        break;
      case 'crit_cue':
        groundRing(0.28, 0.48 + t * 0.2, effect.color, fade * 0.42);
        this.box(group, 0, 1.0 + t * 0.35, 0, 0.18, 0.18, 0.18, material('crit-cue', effect.color, fade * 0.8, 1.2), { ry: t * Math.PI });
        break;
      case 'wood_chips':
      case 'ore_sparks':
      case 'herb_sparkle':
        for (let i = 0; i < 6; i += 1) {
          const angle = i * 1.047 + t * 1.8;
          const radius = 0.14 + t * 0.52;
          const tall = effect.kind === 'herb_sparkle';
          this.box(group, Math.cos(angle) * radius, 0.32 + t * (tall ? 0.7 : 0.35), Math.sin(angle) * radius, effect.kind === 'wood_chips' ? 0.14 : 0.08, tall ? 0.14 : 0.06, effect.kind === 'ore_sparks' ? 0.08 : 0.14, material(effect.kind, effect.color, fade * 0.72, effect.kind === 'ore_sparks' ? 1.0 : 0.45));
        }
        break;
      case 'water_ripple':
        groundRing(0.18 + t * 0.32, 0.24 + t * 0.46, effect.color, fade * 0.42);
        groundRing(0.42 + t * 0.26, 0.48 + t * 0.36, effect.color, fade * 0.24);
        break;
      case 'depleted_cue':
        groundRing(0.36, 0.48 + Math.sin(t * Math.PI) * 0.08, effect.color, 0.24);
        break;
      case 'heal_particles':
        for (let i = 0; i < 6; i += 1) {
          const angle = i * 1.047 + clock * 1.2;
          this.box(group, Math.cos(angle) * 0.32, 0.25 + t * 0.95 + i * 0.025, Math.sin(angle) * 0.32, 0.08, 0.08, 0.08, material('heal-particles', effect.color, fade * 0.68, 0.9));
        }
        break;
      case 'buff_ring':
        groundRing(0.42 + t * 0.08, 0.56 + t * 0.12, effect.color, fade * 0.42);
        this.box(group, 0, 1.0, 0, 0.78, 0.04, 0.78, material('buff-glow', effect.color, fade * 0.2, 0.5));
        break;
      case 'debuff_mark':
        groundRing(0.22, 0.38 + t * 0.08, effect.color, fade * 0.5);
        this.box(group, 0, 1.1, 0, 0.12, 0.34, 0.12, material('debuff-mark', effect.color, fade * 0.7, 0.85), { ry: t * Math.PI });
        break;
      case 'utility_line':
        lineToTarget(0.06, effect.color);
        groundRing(0.18, 0.32 + t * 0.1, effect.color, fade * 0.32);
        break;
      case 'reveal_pulse':
      case 'rune_circle':
        groundRing(0.34 + t * 0.42, 0.44 + t * 0.58, effect.color, fade * 0.5);
        for (let i = 0; i < 4; i += 1) {
          const angle = i * Math.PI * 0.5 + (effect.kind === 'rune_circle' ? clock * 0.8 : 0);
          this.box(group, Math.cos(angle) * (0.46 + t * 0.18), 0.09, Math.sin(angle) * (0.46 + t * 0.18), 0.12, 0.05, 0.12, material(effect.kind, effect.color, fade * 0.55, 0.75));
        }
        break;
      case 'fizzle_smoke':
        for (let i = 0; i < 5; i += 1) {
          const angle = i * 1.256;
          this.box(group, Math.cos(angle) * t * 0.36, 0.78 + t * 0.25, Math.sin(angle) * t * 0.36, 0.14 + t * 0.08, 0.14 + t * 0.08, 0.14 + t * 0.08, material('fizzle-smoke', effect.color, fade * 0.38, 0.25));
        }
        break;
      case 'pickup_gesture':
      case 'interact_gesture':
      case 'craft_loop':
        this.box(group, 0, 0.62 + Math.sin(t * Math.PI) * 0.18, 0.44, 0.18, 0.1, 0.34, material(effect.kind, effect.color, fade * 0.42), { rz: -0.35 + t * 0.7 });
        break;
      default:
        groundRing(0.22, 0.34, effect.color, fade * 0.35);
    }
    return group;
  }

  private makeProjectile(projectile: Projectile, renderLead = 0): THREE.Object3D {
    const t = Math.min(1, (projectile.age + renderLead) / projectile.duration);
    const x = THREE.MathUtils.lerp(projectile.from.x, projectile.to.x, t);
    const y = THREE.MathUtils.lerp(projectile.from.y, projectile.to.y, t) + Math.sin(t * Math.PI) * 0.35;
    const z = THREE.MathUtils.lerp(projectile.from.z, projectile.to.z, t);
    const large = projectile.kind === 'firebolt' || projectile.kind === 'fireball' || projectile.kind === 'heal';
    const emissiveIntensity = projectile.kind === 'arrow' ? 0.2 : projectile.kind === 'lightning' ? 2.2 : 1.35;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(large ? 0.16 : 0.09, 8, 8),
      this.mats.get(`proj-${projectile.color}`, projectile.color, { emissive: projectile.color, emissiveIntensity })
    );
    mesh.position.set(x, y, z);
    mesh.scale.set(projectile.kind === 'arrow' || projectile.kind === 'lightning' ? 1.8 : 1, projectile.kind === 'lightning' ? 1.6 : 0.8, 0.8);
    return mesh;
  }

  private ensureEntity(id: string, kind: string, create: () => THREE.Group): EntityRecord {
    const existing = this.records.get(id);
    if (existing && existing.kind === kind) return existing;
    if (existing) {
      this.entityGroup.remove(existing.group);
      this.disposeObject(existing.group);
    }
    const group = create();
    group.userData.entityId = id;
    group.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.entityId = id;
    });
    this.markPrimaryPickTargets(group);
    this.entityGroup.add(group);
    const record = { group, kind };
    this.records.set(id, record);
    return record;
  }

  private box(
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    material: THREE.Material,
    rotation: { rx?: number; ry?: number; rz?: number } = {}
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.boxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotation.rx ?? 0, rotation.ry ?? 0, rotation.rz ?? 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private instancedBoxes(
    parent: THREE.Group,
    materialName: string,
    color: string,
    sx: number,
    sy: number,
    sz: number,
    instances: Array<{ x: number; y: number; z: number; ry?: number }>
  ): THREE.InstancedMesh | null {
    return this.instancedBoxMaterial(parent, this.mats.get(materialName, color), sx, sy, sz, instances);
  }

  private instancedBoxMaterial(
    parent: THREE.Group,
    material: THREE.Material,
    sx: number,
    sy: number,
    sz: number,
    instances: BoxInstance[]
  ): THREE.InstancedMesh | null {
    if (!instances.length) return null;
    const mesh = new THREE.InstancedMesh(this.boxGeometry(sx, sy, sz), material, instances.length);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    instances.forEach((instance, index) => {
      position.set(instance.x, instance.y, instance.z);
      rotation.set(instance.rx ?? 0, instance.ry ?? 0, instance.rz ?? 0);
      quaternion.setFromEuler(rotation);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private queueInstancedBox(
    batches: Map<string, BoxInstanceBatch>,
    material: THREE.Material,
    sx: number,
    sy: number,
    sz: number,
    instance: BoxInstance
  ): void {
    const key = `${material.uuid}:${sx.toFixed(3)}:${sy.toFixed(3)}:${sz.toFixed(3)}`;
    const batch = batches.get(key) ?? { material, sx, sy, sz, instances: [] };
    batch.instances.push(instance);
    batches.set(key, batch);
  }

  private flushInstancedBoxBatches(parent: THREE.Group, batches: Map<string, BoxInstanceBatch>): void {
    batches.forEach((batch) => this.instancedBoxMaterial(parent, batch.material, batch.sx, batch.sy, batch.sz, batch.instances));
  }

  private boxGeometry(sx: number, sy: number, sz: number): THREE.BoxGeometry {
    const key = `${sx.toFixed(3)}:${sy.toFixed(3)}:${sz.toFixed(3)}`;
    const existing = this.boxGeometries.get(key);
    if (existing) return existing;
    const geometry = new THREE.BoxGeometry(sx, sy, sz);
    geometry.userData.sharedBox = true;
    this.boxGeometries.set(key, geometry);
    return geometry;
  }

  private trackRoof(mesh: THREE.Mesh): void {
    mesh.userData.roof = true;
    this.roofMeshes.push(mesh);
  }

  private addKitGroup(parent: THREE.Group, group: THREE.Group, x: number, z: number): THREE.Group {
    group.position.set(x, 0, z);
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.roof) this.trackRoof(child);
    });
    parent.add(group);
    return group;
  }

  private batchStaticMeshes(): void {
    this.staticGroup.updateMatrixWorld(true);
    const inverseStatic = new THREE.Matrix4().copy(this.staticGroup.matrixWorld).invert();
    const batches = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material; roof: boolean; matrices: THREE.Matrix4[] }>();
    const collected: THREE.Mesh[] = [];
    this.staticGroup.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh) return;
      if (!child.geometry?.userData.sharedBox || Array.isArray(child.material)) return;
      const roof = Boolean(child.userData.roof);
      const key = `${child.geometry.uuid}:${child.material.uuid}:${roof ? 'roof' : 'static'}`;
      let batch = batches.get(key);
      if (!batch) {
        batch = { geometry: child.geometry, material: child.material, roof, matrices: [] };
        batches.set(key, batch);
      }
      batch.matrices.push(new THREE.Matrix4().multiplyMatrices(inverseStatic, child.matrixWorld));
      collected.push(child);
    });
    if (collected.length < 24) return;

    const collectedSet = new Set<THREE.Mesh>(collected);
    const retainedRoofMeshes = this.roofMeshes.filter((mesh) => !collectedSet.has(mesh));
    collected.forEach((mesh) => mesh.parent?.remove(mesh));
    this.roofMeshes = retainedRoofMeshes;

    batches.forEach((batch) => {
      const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
      batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData.batchedStatic = true;
      if (batch.roof) {
        mesh.userData.roof = true;
        this.trackRoof(mesh);
      }
      this.staticGroup.add(mesh);
    });
  }

  private updateRoofCutaway(state: GameState): void {
    if (!this.roofMeshes.length) return;
    const player = state.player.position;
    const insideRoofZone =
      state.player.currentArea === 'town' &&
      this.roofZones.some((zone) => player.x >= zone.minX && player.x <= zone.maxX && player.z >= zone.minZ && player.z <= zone.maxZ);
    const opacity = insideRoofZone ? 0.18 : 1;
    for (const mesh of this.roofMeshes) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        material.transparent = opacity < 1;
        material.opacity = opacity;
        material.depthWrite = opacity >= 1;
      }
    }
  }

  private iconVoxel(parent: THREE.Group, icon: IconDescriptor, x: number, y: number, z: number): void {
    const primary = this.mats.get(`icon-${icon.primary}`, icon.primary);
    const secondary = this.mats.get(`icon-${icon.secondary ?? icon.primary}`, icon.secondary ?? icon.primary);
    if (icon.shape === 'blade') {
      this.box(parent, x, y + 0.15, z, 0.1, 0.75, 0.1, primary, { rz: -0.75 });
      this.box(parent, x - 0.18, y - 0.14, z, 0.1, 0.28, 0.1, secondary, { rz: -0.75 });
    } else if (icon.shape === 'potion') {
      this.box(parent, x, y, z, 0.28, 0.34, 0.28, primary);
      this.box(parent, x, y + 0.25, z, 0.16, 0.18, 0.16, secondary);
    } else {
      this.box(parent, x, y, z, 0.44, 0.36, 0.44, primary);
      this.box(parent, x + 0.1, y + 0.25, z - 0.1, 0.22, 0.14, 0.22, secondary);
    }
  }

  private house(x: number, z: number, w: number, d: number, banner: boolean): void {
    this.roofZones.push({ minX: x - 1.1, maxX: x + w + 0.1, minZ: z - 1.1, maxZ: z + d + 0.1 });
    this.addKitGroup(
      this.staticGroup,
      this.kit.timberHouseBuilder({
        width: w,
        depth: d,
        banner,
        seed: this.tileHash(x, z),
        wear: 0.24,
        colorVariation: 0.045,
        props: true
      }),
      x,
      z
    );
  }

  private interiorShell(woodColor: string, wallColor: string): void {
    const wood = this.mats.get(`interior-wood-${woodColor}`, woodColor);
    const wall = this.mats.get(`interior-wall-${wallColor}`, wallColor);
    for (let x = -7; x <= 7; x += 1) {
      this.box(this.staticGroup, x, 0.8, -5.5, 1, 1.6, 0.35, wall);
      this.box(this.staticGroup, x, 0.8, 7.5, 1, 1.6, 0.35, wall);
      this.box(this.staticGroup, x, 1.7, -5.5, 1, 0.25, 0.38, wood);
      this.box(this.staticGroup, x, 1.7, 7.5, 1, 0.25, 0.38, wood);
    }
    for (let z = -5; z <= 7; z += 1) {
      this.box(this.staticGroup, -7.5, 0.8, z, 0.35, 1.6, 1, wall);
      this.box(this.staticGroup, 7.5, 0.8, z, 0.35, 1.6, 1, wall);
      this.box(this.staticGroup, -7.5, 1.7, z, 0.38, 0.25, 1, wood);
      this.box(this.staticGroup, 7.5, 1.7, z, 0.38, 0.25, 1, wood);
    }
  }

  private marketStall(x: number, z: number, color: string): void {
    this.addKitGroup(this.staticGroup, this.kit.marketStallBuilder({ color, seed: this.tileHash(x, z), wear: 0.28, colorVariation: 0.04, props: true }), x, z);
  }

  private fountain(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.fountainBuilder({ seed: this.tileHash(x, z), colorVariation: 0.025 }), x, z);
  }

  private dock(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.dockBuilder({ length: 5, seed: this.tileHash(x, z), wear: 0.32, colorVariation: 0.035 }), x, z);
  }

  private boat(x: number, z: number): void {
    const wood = this.mats.get('boat', '#6c3e1e');
    this.box(this.staticGroup, x, 0.2, z, 2.2, 0.4, 0.75, wood, { ry: 0.3 });
    this.box(this.staticGroup, x, 0.42, z, 1.5, 0.22, 0.45, this.mats.get('boat-inner', '#3d2517'), { ry: 0.3 });
  }

  private tree(x: number, z: number, scale: number): void {
    this.addKitGroup(this.staticGroup, this.kit.treeBuilder({ size: scale, seed: this.tileHash(x, z), damage: scale < 0.8 ? 0.38 : 0, colorVariation: 0.08, props: true }), x, z);
  }

  private sign(x: number, z: number, _text: string): void {
    const wood = this.mats.get('sign-wood', '#6b421f');
    this.box(this.staticGroup, x - 1, 0.75, z, 0.18, 1.5, 0.18, wood);
    this.box(this.staticGroup, x + 1, 0.75, z, 0.18, 1.5, 0.18, wood);
    this.box(this.staticGroup, x, 1.1, z, 2.4, 0.55, 0.14, wood);
  }

  private servicePlaque(x: number, z: number, accent: string): void {
    const post = this.mats.get('service-plaque-post', '#5b351b');
    const face = this.mats.get(`service-plaque-${accent}`, accent, { emissive: accent, emissiveIntensity: 0.12 });
    this.box(this.staticGroup, x, 0.72, z, 0.16, 1.15, 0.16, post);
    this.box(this.staticGroup, x, 1.12, z - 0.1, 0.72, 0.46, 0.08, face);
    this.box(this.staticGroup, x, 0.08, z + 0.22, 0.9, 0.05, 0.32, face, { ry: 0.15 });
  }

  private routeStone(x: number, z: number, accent: string): void {
    const stone = this.mats.get(`route-stone-${accent}`, accent, { emissive: accent, emissiveIntensity: 0.08 });
    for (let i = 0; i < 3; i += 1) {
      this.box(this.staticGroup, x + (i - 1) * 0.34, 0.07, z - 0.48, 0.24, 0.08, 0.24, stone, { ry: i * 0.24 });
    }
  }

  private townRouteGrounding(): void {
    const line = (fromX: number, fromZ: number, toX: number, toZ: number, count: number, wobble = 0.12): BoxInstance[] => {
      const points: BoxInstance[] = [];
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0 : i / (count - 1);
        const x = THREE.MathUtils.lerp(fromX, toX, t);
        const z = THREE.MathUtils.lerp(fromZ, toZ, t);
        const offset = ((i % 3) - 1) * wobble;
        points.push({ x: x + offset, y: 0.035, z: z - offset * 0.4, ry: (i % 5) * 0.18 });
      }
      return points;
    };
    const plazaRing: BoxInstance[] = [];
    for (let i = 0; i < 16; i += 1) {
      const angle = (i / 16) * Math.PI * 2;
      plazaRing.push({ x: Math.cos(angle) * 3.15, y: 0.04, z: Math.sin(angle) * 3.15, ry: angle });
    }
    this.instancedBoxes(this.staticGroup, 'town-route-plaza-cobbles', '#8d8272', 0.44, 0.05, 0.28, plazaRing);
    this.instancedBoxes(this.staticGroup, 'town-route-service-cobbles', '#8f806c', 0.48, 0.045, 0.3, [
      ...line(-8.2, -1.6, -2.4, -1.2, 7),
      ...line(2.2, -1.2, 6.4, -2.7, 6)
    ]);
    this.instancedBoxes(this.staticGroup, 'town-route-market-cobbles', '#9b855a', 0.5, 0.045, 0.32, [
      ...line(2.8, 1.4, 7.5, 5.1, 7),
      ...line(6.8, 5.9, 12.4, 5.2, 6)
    ]);
    this.instancedBoxes(this.staticGroup, 'town-route-exit-cobbles', '#837969', 0.46, 0.045, 0.28, [
      ...line(0, 3.5, 0, 12.5, 10),
      ...line(3.5, 3.0, 12.2, 4.2, 9),
      ...line(-2.8, 3.0, -13.5, 11.4, 11)
    ]);
    this.instancedBoxes(this.staticGroup, 'town-route-waterfront-cobbles', '#6e8792', 0.44, 0.045, 0.3, line(-14.5, 11.0, -17.2, 14.2, 5));
  }

  private plazaPlanter(x: number, z: number, accent: string): void {
    const wood = this.mats.get('plaza-planter-wood', '#6a4428');
    const soil = this.mats.get('plaza-planter-soil', '#3f2f20');
    this.box(this.staticGroup, x, 0.09, z, 1.45, 0.14, 0.74, soil);
    this.box(this.staticGroup, x, 0.18, z - 0.42, 1.55, 0.22, 0.12, wood);
    this.box(this.staticGroup, x, 0.18, z + 0.42, 1.55, 0.22, 0.12, wood);
    this.box(this.staticGroup, x - 0.82, 0.18, z, 0.12, 0.22, 0.82, wood);
    this.box(this.staticGroup, x + 0.82, 0.18, z, 0.12, 0.22, 0.82, wood);
    this.flowerBed(x, z, accent);
  }

  private townPavingMosaic(): void {
    const highlights: BoxInstance[] = [];
    const seams: BoxInstance[] = [];
    const guideAnchors = briarbrookTownSquareReference.dressing.pathGuides.map((guide) => guide.position);
    for (let x = -13; x <= 14; x += 1) {
      for (let z = -6; z <= 13; z += 1) {
        const nearGuide = guideAnchors.some((guide) => Math.hypot(guide.x - x, guide.z - z) <= 4.6);
        const inPlaza = Math.abs(x) <= 6 && z >= -4 && z <= 8;
        const inMarket = x >= 3 && x <= 13 && z >= 2 && z <= 9;
        const inService = z <= 0 && x >= -10 && x <= 8;
        const inFerry = x <= -8 && z >= 7;
        if (!nearGuide && !inPlaza && !inMarket && !inService && !inFerry) continue;
        const hash = this.tileHash(x * 3, z * 5);
        if (hash % 2 === 0) {
          highlights.push({
            x: x + ((hash % 5) - 2) * 0.045,
            y: 0.035,
            z: z + ((hash % 7) - 3) * 0.035,
            ry: (hash % 12) * 0.13
          });
        }
        if (hash % 3 === 0) {
          seams.push({
            x: x + ((hash % 3) - 1) * 0.08,
            y: 0.052,
            z: z - ((hash % 4) - 1.5) * 0.07,
            ry: hash % 2 ? Math.PI * 0.5 : 0
          });
        }
      }
    }
    this.instancedBoxes(this.staticGroup, 'town-paving-highlight', '#9b9383', 0.5, 0.035, 0.16, highlights);
    this.instancedBoxes(this.staticGroup, 'town-paving-seam', '#4d4941', 0.62, 0.025, 0.045, seams);
  }

  private townSquareReferenceDressing(): void {
    for (const tree of briarbrookTownSquareReference.dressing.shadeTrees) this.tree(tree.position.x, tree.position.z, 0.86);
    for (const bed of briarbrookTownSquareReference.dressing.flowerBeds) this.flowerBed(bed.position.x, bed.position.z, bed.accent ?? '#dfd8b1');
    for (const banner of briarbrookTownSquareReference.dressing.banners) this.civicBanner(banner.position.x, banner.position.z, banner.accent ?? '#1f5a95');
    for (const stack of briarbrookTownSquareReference.dressing.marketStacks) this.marketStack(stack.position.x, stack.position.z);
    this.fountainTrim();
    this.townGroundFlowers();
  }

  private flowerBed(x: number, z: number, accent: string): void {
    this.addKitGroup(this.staticGroup, this.kit.flowerBushBuilder({ seed: this.tileHash(x, z), color: accent, colorVariation: 0.04, props: true }), x, z);
    this.addKitGroup(this.staticGroup, this.kit.flowerBushBuilder({ seed: this.tileHash(x + 1, z), color: accent, colorVariation: 0.04, props: true }), x + 0.62, z + 0.18);
    this.addKitGroup(this.staticGroup, this.kit.flowerBushBuilder({ seed: this.tileHash(x - 1, z), color: '#f0ead4', colorVariation: 0.04, props: true }), x - 0.58, z - 0.12);
  }

  private civicBanner(x: number, z: number, accent: string): void {
    const post = this.mats.get('civic-banner-post', '#5b351b');
    const cloth = this.mats.get(`civic-banner-${accent}`, accent);
    const trim = this.mats.get('civic-banner-trim', '#d6b45a');
    this.box(this.staticGroup, x, 0.95, z, 0.16, 1.9, 0.16, post);
    this.box(this.staticGroup, x + 0.44, 1.42, z, 0.72, 0.64, 0.08, cloth);
    this.box(this.staticGroup, x + 0.44, 1.15, z - 0.01, 0.5, 0.08, 0.09, trim);
  }

  private marketStack(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.crateBarrelStackBuilder({ seed: this.tileHash(x, z), wear: 0.28, colorVariation: 0.035, props: true }), x, z);
    this.box(this.staticGroup, x - 0.18, 0.62, z - 0.38, 0.22, 0.18, 0.22, this.mats.get('market-produce-red', '#b74432'));
    this.box(this.staticGroup, x + 0.24, 0.62, z - 0.3, 0.2, 0.16, 0.2, this.mats.get('market-produce-green', '#5d8b3b'));
  }

  private fountainTrim(): void {
    const stone = this.mats.get('fountain-trim-civic-stone', '#9a9486');
    for (const [x, z, ry] of [
      [-2.1, -2.1, 0],
      [2.1, -2.1, 0],
      [-2.1, 2.1, 0],
      [2.1, 2.1, 0]
    ] as Array<[number, number, number]>) {
      this.box(this.staticGroup, x, 0.08, z, 0.65, 0.08, 0.2, stone, { ry });
      this.box(this.staticGroup, x, 0.1, z, 0.2, 0.1, 0.65, stone, { ry });
    }
  }

  private townGroundFlowers(): void {
    const colors = ['#dfd8b1', '#cd584c', '#6f87d4', '#e8bf4b'];
    for (let colorIndex = 0; colorIndex < colors.length; colorIndex += 1) {
      const instances: Array<{ x: number; y: number; z: number; ry?: number }> = [];
      for (let i = 0; i < 14; i += 1) {
        const n = i * 4 + colorIndex;
        const x = -11 + ((n * 7) % 23);
        const z = -8 + ((n * 11) % 19);
        if (Math.abs(x) < 3 && Math.abs(z) < 3) continue;
        if (x > 5 && z > 2 && z < 7) continue;
        instances.push({ x: x + (colorIndex - 1.5) * 0.08, y: 0.16, z, ry: (n % 6) * 0.18 });
      }
      this.instancedBoxes(this.staticGroup, `town-ground-flower-${colorIndex}`, colors[colorIndex], 0.1, 0.16, 0.1, instances);
    }
  }

  private forgeSmokeMarker(x: number, z: number): void {
    const ember = this.mats.get('smithy-door-ember', '#ff8a2e', { emissive: '#ff5c1f', emissiveIntensity: 1.2 });
    const smoke = this.mats.get('smithy-smoke-marker', '#7b7f80', { transparent: true, opacity: 0.38 });
    this.box(this.staticGroup, x + 0.55, 0.28, z - 0.45, 0.5, 0.18, 0.5, ember);
    this.box(this.staticGroup, x + 0.4, 1.25, z - 0.6, 0.32, 0.48, 0.32, smoke);
    this.box(this.staticGroup, x + 0.74, 1.7, z - 0.48, 0.42, 0.42, 0.42, smoke);
  }

  private cryptDoorMarker(x: number, z: number): void {
    const stone = this.mats.get('crypt-door-stone', '#42403d');
    const dark = this.mats.get('crypt-door-dark', '#11100f');
    this.box(this.staticGroup, x, 1.0, z - 0.7, 2.2, 2.0, 0.28, stone);
    this.box(this.staticGroup, x, 0.88, z - 0.86, 1.15, 1.55, 0.18, dark);
    this.box(this.staticGroup, x, 1.72, z - 0.98, 1.55, 0.16, 0.16, this.mats.get('crypt-door-lintel', '#5a5750'));
  }

  private plotMarker(x: number, z: number): void {
    const post = this.mats.get('plot-marker-post', '#6b421f');
    const cloth = this.mats.get('plot-marker-cloth', '#8ee0a1');
    this.box(this.staticGroup, x, 0.75, z, 0.18, 1.5, 0.18, post);
    this.box(this.staticGroup, x + 0.45, 1.3, z, 0.8, 0.45, 0.08, cloth);
  }

  private counter(x: number, z: number, width: number): void {
    this.addKitGroup(this.staticGroup, this.kit.bankCounterBuilder({ width, seed: this.tileHash(x, z), colorVariation: 0.025 }), x + (width - 1) / 2, z);
  }

  private bankServiceDressing(): void {
    this.bankShelf(-4.9, -4.2, 0);
    this.bankShelf(4.9, -4.2, 0);
    this.bankShelf(0, -4.35, 0);
    this.bankShelf(-5.1, 3.8, Math.PI);
    this.ledgerStack(-1.1, -0.55);
    this.ledgerStack(1.2, -0.55);
    this.secureChestStack(4.4, 0.4);
    this.secureChestStack(-4.4, 3.4);
  }

  private bankCustomerLane(): void {
    const brass = this.mats.get('bank-queue-brass', '#c8a455', { metalness: 0.25 });
    const rope = this.mats.get('bank-queue-rope', '#8f6230');
    for (const x of [-2.4, 0, 2.4]) {
      this.box(this.staticGroup, x, 0.38, 1.05, 0.12, 0.76, 0.12, brass);
      this.box(this.staticGroup, x, 0.38, 3.35, 0.12, 0.76, 0.12, brass);
    }
    this.box(this.staticGroup, -1.2, 0.72, 1.05, 2.4, 0.08, 0.08, rope);
    this.box(this.staticGroup, 1.2, 0.72, 1.05, 2.4, 0.08, 0.08, rope);
    this.box(this.staticGroup, -1.2, 0.72, 3.35, 2.4, 0.08, 0.08, rope);
    this.box(this.staticGroup, 1.2, 0.72, 3.35, 2.4, 0.08, 0.08, rope);
  }

  private bankShelf(x: number, z: number, ry: number): void {
    const shelf = this.addKitGroup(this.staticGroup, this.kit.bankShelfBuilder({ seed: this.tileHash(x, z), colorVariation: 0.025 }), x, z);
    shelf.rotation.y = ry;
  }

  private ledgerStack(x: number, z: number): void {
    const paper = this.mats.get('bank-ledger-paper', '#d7bf8d');
    const ink = this.mats.get('bank-ledger-ink', '#36261a');
    this.box(this.staticGroup, x, 1.04, z, 0.76, 0.05, 0.44, paper, { ry: -0.18 });
    this.box(this.staticGroup, x - 0.12, 1.075, z, 0.06, 0.025, 0.34, ink, { ry: -0.18 });
    this.box(this.staticGroup, x + 0.12, 1.08, z - 0.05, 0.04, 0.025, 0.28, ink, { ry: -0.18 });
  }

  private ledgerDesk(x: number, z: number): void {
    this.worktable(x, z, '#d7bf8d');
    this.ledgerStack(x - 0.2, z - 0.05);
    this.box(this.staticGroup, x + 0.52, 0.82, z + 0.18, 0.08, 0.34, 0.08, this.mats.get('bank-quill', '#efe7cf'), { rz: 0.42 });
    this.box(this.staticGroup, x + 0.35, 0.75, z - 0.22, 0.28, 0.12, 0.28, this.mats.get('bank-inkwell', '#1d1711'));
  }

  private secureChestStack(x: number, z: number): void {
    this.chest(x, z);
    this.box(this.staticGroup, x + 0.42, 0.58, z - 0.18, 0.5, 0.28, 0.42, this.mats.get('bank-lockbox', '#5d4328'));
    this.box(this.staticGroup, x + 0.42, 0.74, z - 0.18, 0.22, 0.08, 0.08, this.mats.get('bank-lockbox-brass', '#c9a24f', { metalness: 0.2 }));
  }

  private chest(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.chestBuilder({ seed: this.tileHash(x, z), colorVariation: 0.04 }), x, z);
  }

  private banner(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.bannerBuilder({ seed: this.tileHash(x, z), color: '#1f5a95', colorVariation: 0.035 }), x, z);
  }

  private rug(x: number, z: number, color: string): void {
    this.box(this.staticGroup, x, 0.03, z, 3, 0.05, 2.2, this.mats.get(`rug-${color}`, color));
    this.box(this.staticGroup, x, 0.06, z, 1.2, 0.04, 0.7, this.mats.get('rug-gold', '#b88b34'));
  }

  private crates(x: number, z: number): void {
    const wood = this.mats.get('crate', '#68401f');
    this.box(this.staticGroup, x, 0.35, z, 0.75, 0.7, 0.75, wood);
    this.box(this.staticGroup, x + 0.65, 0.25, z + 0.15, 0.55, 0.5, 0.55, wood);
  }

  private lantern(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.lampPostBuilder({ size: 0.72, seed: this.tileHash(x, z), color: '#ffbd55' }), x, z);
  }

  private forge(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.forgeBuilder({ seed: this.tileHash(x, z), colorVariation: 0.035, props: true }), x, z);
  }

  private smithyServiceDressing(): void {
    this.forgeGlow(2.4, -2.4);
    this.ingotCrates(-5.1, -0.6);
    this.ingotCrates(4.4, -1.1);
    this.repairBench(-2.5, 2.7);
    this.box(this.staticGroup, 0.6, 0.82, 1.1, 0.44, 0.12, 0.18, this.mats.get('smith-hot-ingot', '#ff8a2e', { emissive: '#ff5c1f', emissiveIntensity: 0.7 }), { ry: -0.2 });
  }

  private forgeGlow(x: number, z: number): void {
    const hot = this.mats.get('forge-service-glow', '#ff6a24', { emissive: '#ff4d12', emissiveIntensity: 1.05 });
    const coal = this.mats.get('forge-service-coal', '#191613');
    this.box(this.staticGroup, x, 0.72, z + 0.18, 1.28, 0.1, 0.74, hot);
    this.box(this.staticGroup, x - 0.36, 0.8, z + 0.06, 0.22, 0.12, 0.22, coal);
    this.box(this.staticGroup, x + 0.34, 0.82, z + 0.2, 0.18, 0.12, 0.2, coal);
  }

  private anvil(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.anvilBuilder({ seed: this.tileHash(x, z), colorVariation: 0.02 }), x, z);
  }

  private oreBins(x: number, z: number): void {
    this.crates(x, z);
    this.box(this.staticGroup, x, 0.75, z, 0.55, 0.25, 0.55, this.mats.get('iron-ore-pile', '#9aa2a0'));
    this.crates(x + 1.3, z);
    this.box(this.staticGroup, x + 1.3, 0.75, z, 0.55, 0.25, 0.55, this.mats.get('copper-ore-pile', '#b77745'));
  }

  private ingotCrates(x: number, z: number): void {
    this.crates(x, z);
    const iron = this.mats.get('stacked-iron-ingot', '#b7b8ad', { metalness: 0.25, roughness: 0.62 });
    const copper = this.mats.get('stacked-copper-ingot', '#c47742', { metalness: 0.2, roughness: 0.64 });
    for (let i = 0; i < 4; i += 1) {
      this.box(this.staticGroup, x - 0.24 + i * 0.16, 0.74 + (i % 2) * 0.07, z - 0.16, 0.24, 0.08, 0.12, iron, { ry: 0.08 });
      this.box(this.staticGroup, x - 0.2 + i * 0.15, 0.72 + ((i + 1) % 2) * 0.06, z + 0.15, 0.22, 0.08, 0.12, copper, { ry: -0.12 });
    }
  }

  private repairBench(x: number, z: number): void {
    this.worktable(x, z, '#d0984a');
    const leather = this.mats.get('repair-bench-leather', '#7c4e2c');
    const metal = this.mats.get('repair-bench-metal', '#9fa4a0', { metalness: 0.22 });
    this.box(this.staticGroup, x - 0.35, 0.75, z, 0.44, 0.08, 0.32, leather, { ry: 0.18 });
    this.box(this.staticGroup, x + 0.34, 0.77, z - 0.08, 0.44, 0.08, 0.2, metal, { ry: -0.24 });
    this.box(this.staticGroup, x + 0.08, 0.86, z + 0.24, 0.1, 0.28, 0.1, this.mats.get('repair-bench-awl', '#d8c28a', { metalness: 0.2 }), { rz: 0.45 });
  }

  private quenchTub(x: number, z: number): void {
    const iron = this.mats.get('quench-tub-band', '#5c5d59', { metalness: 0.25 });
    const water = this.mats.get('quench-tub-water', '#2d6f83', { roughness: 0.25 });
    const wood = this.mats.get('quench-tub-wood', '#6d4322');
    this.box(this.staticGroup, x, 0.38, z, 1.05, 0.7, 0.72, wood);
    this.box(this.staticGroup, x, 0.76, z, 0.92, 0.08, 0.58, water);
    this.box(this.staticGroup, x, 0.44, z - 0.38, 1.1, 0.1, 0.08, iron);
    this.box(this.staticGroup, x, 0.44, z + 0.38, 1.1, 0.1, 0.08, iron);
  }

  private weaponStand(x: number, z: number): void {
    const wood = this.mats.get('weapon-stand-wood', '#5f3a1d');
    const steel = this.mats.get('weapon-stand-steel', '#b7bbb6', { metalness: 0.35 });
    this.box(this.staticGroup, x, 0.42, z, 1.2, 0.12, 0.18, wood);
    this.box(this.staticGroup, x - 0.45, 0.86, z, 0.1, 0.88, 0.1, wood);
    this.box(this.staticGroup, x + 0.45, 0.86, z, 0.1, 0.88, 0.1, wood);
    this.box(this.staticGroup, x - 0.2, 1.0, z + 0.05, 0.08, 1.1, 0.08, steel, { rz: 0.28 });
    this.box(this.staticGroup, x + 0.22, 1.0, z - 0.03, 0.08, 1.0, 0.08, steel, { rz: -0.22 });
  }

  private toolRack(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.toolRackBuilder({ seed: this.tileHash(x, z), colorVariation: 0.025 }), x, z);
  }

  private worktable(x: number, z: number, accent: string): void {
    const wood = this.mats.get('worktable-wood', '#68401f');
    this.box(this.staticGroup, x, 0.42, z, 1.6, 0.28, 0.9, wood);
    this.box(this.staticGroup, x - 0.55, 0.18, z - 0.28, 0.16, 0.36, 0.16, wood);
    this.box(this.staticGroup, x + 0.55, 0.18, z + 0.28, 0.16, 0.36, 0.16, wood);
    this.box(this.staticGroup, x, 0.64, z, 0.9, 0.08, 0.16, this.mats.get(`work-accent-${accent}`, accent));
  }

  private alchemyTable(x: number, z: number): void {
    this.worktable(x, z, '#67c56b');
    this.box(this.staticGroup, x - 0.35, 0.78, z, 0.22, 0.28, 0.22, this.mats.get('alchemy-red', '#cf2d35', { emissive: '#cf2d35', emissiveIntensity: 0.25 }));
    this.box(this.staticGroup, x + 0.35, 0.78, z + 0.08, 0.22, 0.28, 0.22, this.mats.get('alchemy-blue', '#245ee9', { emissive: '#245ee9', emissiveIntensity: 0.25 }));
  }

  private scribeDesk(x: number, z: number): void {
    this.worktable(x, z, '#d9bd89');
    this.box(this.staticGroup, x, 0.73, z, 0.7, 0.04, 0.42, this.mats.get('open-scroll', '#d9bd89'));
    this.box(this.staticGroup, x + 0.5, 0.78, z - 0.2, 0.08, 0.36, 0.08, this.mats.get('quill', '#d8d5c9'), { rz: 0.5 });
  }

  private loom(x: number, z: number): void {
    const wood = this.mats.get('loom-wood', '#6a421f');
    this.box(this.staticGroup, x, 0.8, z, 1.4, 1.2, 0.16, wood);
    this.box(this.staticGroup, x, 0.8, z + 0.08, 1.0, 0.8, 0.08, this.mats.get('loom-cloth', '#d8d5c9'));
    this.box(this.staticGroup, x, 0.38, z + 0.35, 1.6, 0.18, 0.18, wood);
  }

  private cookingFire(x: number, z: number): void {
    this.box(this.staticGroup, x, 0.15, z, 1.1, 0.24, 1.1, this.mats.get('cook-stones', '#55524d'));
    this.box(this.staticGroup, x, 0.38, z, 0.52, 0.36, 0.52, this.mats.get('cook-fire', '#ff8a2e', { emissive: '#ff5c1f', emissiveIntensity: 1.4 }));
    this.box(this.staticGroup, x, 0.86, z, 0.8, 0.14, 0.8, this.mats.get('cook-pot', '#343434', { metalness: 0.35 }));
  }

  private tinkerBench(x: number, z: number): void {
    this.worktable(x, z, '#b8bab9');
    this.box(this.staticGroup, x - 0.36, 0.76, z, 0.22, 0.12, 0.22, this.mats.get('gear-prop', '#b8bab9', { metalness: 0.25 }));
    this.box(this.staticGroup, x + 0.25, 0.78, z + 0.16, 0.36, 0.1, 0.12, this.mats.get('lockpick-prop', '#c0c2bf', { metalness: 0.35 }));
  }

  private mineEntrance(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.mineEntranceBuilder({ seed: this.tileHash(x, z), colorVariation: 0.025 }), x, z);
  }

  private oreCluster(x: number, z: number, color: string): void {
    this.addKitGroup(this.staticGroup, this.kit.oreVeinBuilder({ color, seed: this.tileHash(x, z), colorVariation: 0.05 }), x, z);
  }

  private bridge(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.bridgeBuilder({ length: 5, seed: this.tileHash(x, z), wear: 0.3, colorVariation: 0.04 }), x, z);
  }

  private flowers(): void {
    for (let i = 0; i < 60; i += 1) {
      const x = -12 + ((i * 7) % 24);
      const z = -10 + ((i * 11) % 20);
      if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;
      this.box(this.staticGroup, x + 0.2, 0.12, z - 0.1, 0.12, 0.18, 0.12, this.mats.get(`flower-${i % 4}`, ['#dfd8b1', '#cd584c', '#6f87d4', '#e8bf4b'][i % 4]));
    }
  }

  private gardenPatch(x: number, z: number): void {
    for (let ix = 0; ix < 3; ix += 1) {
      for (let iz = 0; iz < 2; iz += 1) {
        this.box(this.staticGroup, x + ix, 0.07, z + iz, 0.72, 0.08, 0.72, this.mats.get('garden-soil', '#4f3921'));
        this.box(this.staticGroup, x + ix - 0.12, 0.22, z + iz, 0.12, 0.28, 0.12, this.mats.get('garden-green', '#699a3f'));
        this.box(this.staticGroup, x + ix + 0.14, 0.24, z + iz - 0.1, 0.1, 0.32, 0.1, this.mats.get('garden-flower', '#d7c767'));
      }
    }
  }

  private streamTile(x: number, z: number): void {
    this.box(this.staticGroup, x, 0.02, z, 1.35, 0.05, 1, this.mats.get('stream-water', '#2a6f86', { transparent: true, opacity: 0.76 }));
    this.box(this.staticGroup, x - 0.86, 0.08, z, 0.25, 0.16, 0.8, this.mats.get('stream-bank', '#5b5136'));
    this.box(this.staticGroup, x + 0.86, 0.08, z, 0.25, 0.16, 0.8, this.mats.get('stream-bank2', '#5b5136'));
  }

  private cryptWalls(): void {
    const wall = this.mats.get('crypt-wall', '#343231');
    for (let x = -15; x <= 15; x += 1) {
      this.box(this.staticGroup, x, 0.9, -12.5, 1, 1.8, 0.6, wall);
      this.box(this.staticGroup, x, 0.9, 12.5, 1, 1.8, 0.6, wall);
    }
    for (let z = -12; z <= 12; z += 1) {
      this.box(this.staticGroup, -15.5, 0.9, z, 0.6, 1.8, 1, wall);
      this.box(this.staticGroup, 15.5, 0.9, z, 0.6, 1.8, 1, wall);
    }
  }

  private column(x: number, z: number): void {
    this.addKitGroup(this.staticGroup, this.kit.dungeonColumnBuilder({ seed: this.tileHash(x, z), theme: 'crypt', damage: 0.45, colorVariation: 0.035 }), x, z);
  }

  private torchPost(x: number, z: number, parent = this.staticGroup): void {
    this.addKitGroup(parent, this.kit.lampPostBuilder({ seed: this.tileHash(x, z), color: '#ff9b2f', colorVariation: 0.02 }), x, z);
  }

  private bones(x: number, z: number): void {
    const bone = this.mats.get('floor-bone', '#c9c5b4');
    this.box(this.staticGroup, x, 0.18, z, 0.75, 0.12, 0.16, bone, { ry: 0.5 });
    this.box(this.staticGroup, x + 0.3, 0.2, z + 0.2, 0.2, 0.16, 0.2, bone);
  }

  private blood(x: number, z: number): void {
    this.box(this.staticGroup, x, 0.04, z, 1.1, 0.03, 0.7, this.mats.get('blood', '#5b1513'));
  }

  private wallLine(x1: number, z1: number, x2: number, z2: number): void {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
    if (z1 === z2) {
      this.addKitGroup(this.staticGroup, this.kit.stoneWallBuilder({ length: steps + 1, orientation: 'x', seed: this.tileHash(x1, z1), damage: 0.38, colorVariation: 0.025 }), (x1 + x2) / 2, z1);
      return;
    }
    if (x1 === x2) {
      this.addKitGroup(this.staticGroup, this.kit.stoneWallBuilder({ length: steps + 1, orientation: 'z', seed: this.tileHash(x1, z1), damage: 0.38, colorVariation: 0.025 }), x1, (z1 + z2) / 2);
      return;
    }
    const stone = this.mats.get('low-wall', '#63635d');
    for (let i = 0; i <= steps; i += 1) {
      const t = steps === 0 ? 0 : i / steps;
      const x = Math.round(THREE.MathUtils.lerp(x1, x2, t));
      const z = Math.round(THREE.MathUtils.lerp(z1, z2, t));
      this.box(this.staticGroup, x, 0.4, z, 1, 0.8, 0.5, stone);
    }
  }

  private waterEdge(zStart: number): void {
    for (let x = -13; x <= 13; x += 1) {
      for (let z = zStart; z <= 11; z += 1) {
        this.box(this.staticGroup, x, -0.15, z, 1, 0.12, 1, this.mats.get('river', '#214f6c', { transparent: true, opacity: 0.8 }));
      }
    }
  }

  private barrel(x: number, z: number): void {
    const wood = this.mats.get('prop-barrel', '#7b4a24');
    this.box(this.staticGroup, x, 0.34, z, 0.62, 0.66, 0.62, wood);
    this.box(this.staticGroup, x, 0.14, z, 0.68, 0.08, 0.68, this.mats.get('barrel-band-dark', '#3c2b20', { metalness: 0.1 }));
    this.box(this.staticGroup, x, 0.58, z, 0.68, 0.08, 0.68, this.mats.get('barrel-band-dark2', '#3c2b20', { metalness: 0.1 }));
  }

  private sack(x: number, z: number): void {
    this.box(this.staticGroup, x, 0.22, z, 0.55, 0.42, 0.48, this.mats.get('sack', '#9d8257'));
    this.box(this.staticGroup, x, 0.48, z, 0.28, 0.12, 0.24, this.mats.get('sack-tie', '#5d4627'));
  }

  private bench(x: number, z: number): void {
    const wood = this.mats.get('bench-wood', '#6a421f');
    this.box(this.staticGroup, x, 0.35, z, 1.6, 0.16, 0.42, wood);
    this.box(this.staticGroup, x - 0.55, 0.16, z, 0.16, 0.32, 0.18, wood);
    this.box(this.staticGroup, x + 0.55, 0.16, z, 0.16, 0.32, 0.18, wood);
  }

  private cart(x: number, z: number, color: string): void {
    const wood = this.mats.get(`cart-${color}`, color);
    this.box(this.staticGroup, x, 0.42, z, 1.6, 0.55, 0.95, wood, { ry: 0.18 });
    this.box(this.staticGroup, x - 0.72, 0.13, z - 0.46, 0.25, 0.25, 0.16, this.mats.get('cart-wheel', '#2b1b12'), { ry: 0.18 });
    this.box(this.staticGroup, x + 0.72, 0.13, z + 0.46, 0.25, 0.25, 0.16, this.mats.get('cart-wheel2', '#2b1b12'), { ry: 0.18 });
    this.box(this.staticGroup, x + 1.05, 0.36, z, 1.0, 0.12, 0.12, wood, { ry: 0.18 });
  }

  private well(x: number, z: number): void {
    const stone = this.mats.get('well-stone', '#777268');
    this.box(this.staticGroup, x, 0.35, z, 1.4, 0.55, 1.4, stone);
    this.box(this.staticGroup, x, 0.45, z, 0.82, 0.36, 0.82, this.mats.get('well-water', '#225d78', { transparent: true, opacity: 0.76 }));
    this.box(this.staticGroup, x - 0.65, 1.05, z, 0.15, 1.4, 0.15, this.mats.get('well-wood', '#5a341b'));
    this.box(this.staticGroup, x + 0.65, 1.05, z, 0.15, 1.4, 0.15, this.mats.get('well-wood2', '#5a341b'));
    this.box(this.staticGroup, x, 1.68, z, 1.7, 0.2, 0.75, this.mats.get('well-roof', '#77401c'));
  }

  private flowerBox(x: number, z: number): void {
    const wood = this.mats.get('flowerbox-wood', '#5d351b');
    this.box(this.staticGroup, x, 0.62, z, 0.9, 0.22, 0.28, wood);
    this.box(this.staticGroup, x - 0.25, 0.82, z, 0.12, 0.28, 0.12, this.mats.get('flowerbox-red', '#c84d3c'));
    this.box(this.staticGroup, x + 0.05, 0.82, z, 0.12, 0.28, 0.12, this.mats.get('flowerbox-blue', '#5b75c7'));
    this.box(this.staticGroup, x + 0.28, 0.82, z, 0.12, 0.28, 0.12, this.mats.get('flowerbox-yellow', '#ddc55a'));
  }

  private stump(x: number, z: number): void {
    this.box(this.staticGroup, x, 0.28, z, 0.58, 0.56, 0.58, this.mats.get('stump', '#674222'));
    this.box(this.staticGroup, x, 0.59, z, 0.48, 0.06, 0.48, this.mats.get('stump-top', '#9a7040'));
  }

  private logPile(x: number, z: number): void {
    const log = this.mats.get('log-pile', '#76502d');
    this.box(this.staticGroup, x, 0.18, z, 1.3, 0.28, 0.28, log, { ry: 0.2 });
    this.box(this.staticGroup, x + 0.12, 0.42, z + 0.22, 1.1, 0.24, 0.24, log, { ry: 0.2 });
    this.box(this.staticGroup, x - 0.42, 0.66, z - 0.16, 0.8, 0.22, 0.22, log, { ry: 0.2 });
  }

  private mushrooms(x: number, z: number): void {
    for (let i = 0; i < 3; i += 1) {
      const ox = (i - 1) * 0.22;
      const cap = i === 1 ? '#d4664b' : '#d8c686';
      this.box(this.staticGroup, x + ox, 0.13, z + i * 0.12, 0.08, 0.24, 0.08, this.mats.get('mushroom-stem', '#dfd0b5'));
      this.box(this.staticGroup, x + ox, 0.28, z + i * 0.12, 0.22, 0.1, 0.22, this.mats.get(`mushroom-${cap}`, cap));
    }
  }

  private rockScatter(x: number, z: number): void {
    this.addKitGroup(
      this.staticGroup,
      this.kit.rockBuilder({
        seed: this.tileHash(x, z),
        variation: 'scatter',
        theme: 'forest',
        wear: 0.24,
        colorVariation: 0.035,
        metadata: { affordance: 'environment-detail' }
      }),
      x,
      z
    );
  }

  private fallenBranch(x: number, z: number): void {
    const wood = this.mats.get('fallen-branch', '#65401f');
    this.box(this.staticGroup, x, 0.12, z, 1.4, 0.12, 0.12, wood, { ry: 0.7 });
    this.box(this.staticGroup, x + 0.36, 0.2, z - 0.28, 0.58, 0.1, 0.1, wood, { ry: -0.2 });
  }

  private bushPatch(x: number, z: number): void {
    this.box(this.staticGroup, x, 0.3, z, 0.8, 0.6, 0.8, this.mats.get('bush', '#3f6b31'));
    this.box(this.staticGroup, x + 0.45, 0.22, z + 0.18, 0.55, 0.44, 0.55, this.mats.get('bush2', '#4f7938'));
  }

  private tomb(x: number, z: number): void {
    const stone = this.mats.get('tomb-stone', '#5c5954');
    this.box(this.staticGroup, x, 0.28, z, 1.7, 0.45, 0.78, stone, { ry: 0.16 });
    this.box(this.staticGroup, x - 0.62, 0.68, z, 0.28, 0.5, 0.84, stone, { ry: 0.16 });
  }

  private rubble(x: number, z: number): void {
    this.addKitGroup(
      this.staticGroup,
      this.kit.rubbleBuilder({
        seed: this.tileHash(x, z),
        variation: 'crypt-floor',
        theme: 'crypt',
        damage: 0.55,
        colorVariation: 0.025,
        metadata: { affordance: 'danger-detail' }
      }),
      x,
      z
    );
  }

  private candle(x: number, z: number): void {
    this.box(this.staticGroup, x, 0.2, z, 0.14, 0.38, 0.14, this.mats.get('candle-wax', '#d8cfb6'));
    this.box(this.staticGroup, x, 0.46, z, 0.12, 0.12, 0.12, this.mats.get('candle-flame', '#ffb742', { emissive: '#ff8c21', emissiveIntensity: 1.1 }));
  }

  private crackedWall(x: number, z: number): void {
    const crack = this.mats.get('wall-crack', '#151515');
    this.box(this.staticGroup, x, 1.05, z, 0.08, 1.0, 0.08, crack, { rz: 0.32 });
    this.box(this.staticGroup, x, 0.78, z + 0.22, 0.07, 0.55, 0.07, crack, { rz: -0.18 });
  }

  private chain(x: number, z: number): void {
    const iron = this.mats.get('chain-iron', '#3a3d3f', { metalness: 0.45, roughness: 0.55 });
    for (let i = 0; i < 4; i += 1) this.box(this.staticGroup, x, 1.5 - i * 0.22, z, 0.11, 0.16, 0.04, iron, { ry: i % 2 ? Math.PI / 2 : 0 });
  }

  private brokenWeapon(x: number, z: number): void {
    this.box(this.staticGroup, x, 0.13, z, 0.12, 0.82, 0.08, this.mats.get('broken-blade', '#8f918e', { metalness: 0.25 }), { rz: -1.1 });
    this.box(this.staticGroup, x - 0.22, 0.1, z + 0.12, 0.12, 0.38, 0.1, this.mats.get('broken-hilt', '#62401f'), { rz: -1.1 });
  }

  private wagonTracks(x: number, z: number): void {
    const dirt = this.mats.get('wagon-rut', '#4e3c2a');
    this.box(this.staticGroup, x, 0.045, z - 0.42, 2.3, 0.035, 0.12, dirt, { ry: 0.14 });
    this.box(this.staticGroup, x, 0.045, z + 0.42, 2.3, 0.035, 0.12, dirt, { ry: 0.14 });
  }

  private roadReferenceDressing(): void {
    for (const fence of adventureReferencePlan.road.dressing.lowFences) this.lowFence(fence.x1, fence.z1, fence.x2, fence.z2);
    for (const embankment of adventureReferencePlan.road.dressing.embankments) this.embankment(embankment.x, embankment.z);
    this.roadTargetClearanceMarkers();
  }

  private lowFence(x1: number, z1: number, x2: number, z2: number): void {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
    const wood = this.mats.get('road-low-fence', '#6a421f');
    const rail = this.mats.get('road-low-fence-rail', '#7c512d');
    for (let i = 0; i <= steps; i += 2) {
      const t = steps === 0 ? 0 : i / steps;
      const x = THREE.MathUtils.lerp(x1, x2, t);
      const z = THREE.MathUtils.lerp(z1, z2, t);
      this.box(this.staticGroup, x, 0.42, z, 0.16, 0.84, 0.16, wood);
    }
    const centerX = (x1 + x2) * 0.5;
    const centerZ = (z1 + z2) * 0.5;
    const length = Math.hypot(x2 - x1, z2 - z1) + 0.8;
    const ry = Math.atan2(x2 - x1, z2 - z1);
    this.box(this.staticGroup, centerX, 0.62, centerZ, 0.12, 0.14, length, rail, { ry });
  }

  private embankment(x: number, z: number): void {
    const dirt = this.mats.get('road-embankment-dirt', '#51422f');
    const grass = this.mats.get('road-embankment-grass', '#5f7d43');
    this.box(this.staticGroup, x, 0.16, z, 2.2, 0.28, 0.72, dirt, { ry: 0.28 });
    this.box(this.staticGroup, x + 0.18, 0.34, z - 0.08, 1.7, 0.18, 0.44, grass, { ry: 0.28 });
    this.rockScatter(x + 0.9, z + 0.35);
  }

  private checkpointGate(x: number, z: number): void {
    const wood = this.mats.get('checkpoint-wood', '#60401f');
    const cloth = this.mats.get('checkpoint-cloth', '#274f82');
    this.box(this.staticGroup, x - 1.2, 0.8, z, 0.18, 1.6, 0.18, wood);
    this.box(this.staticGroup, x + 1.2, 0.8, z, 0.18, 1.6, 0.18, wood);
    this.box(this.staticGroup, x, 1.48, z, 2.65, 0.18, 0.18, wood);
    this.box(this.staticGroup, x, 1.18, z - 0.06, 0.76, 0.54, 0.08, cloth);
    this.crates(x - 1.9, z + 0.55);
  }

  private roadTargetClearanceMarkers(): void {
    const stone = this.mats.get('road-clearance-stones', '#8a8375');
    for (const [x, z] of [
      [-2.8, -2.7],
      [2.8, -2.5],
      [-3.2, 2.8],
      [3.3, 2.6]
    ] as Array<[number, number]>) {
      this.box(this.staticGroup, x, 0.07, z, 0.28, 0.08, 0.28, stone, { ry: (x + z) * 0.12 });
    }
  }

  private mineTrack(x: number, z: number): void {
    const rail = this.mats.get('mine-track-rail', '#5a5a55', { metalness: 0.25 });
    const tie = this.mats.get('mine-track-tie', '#5d3920');
    this.box(this.staticGroup, x - 0.28, 0.08, z, 0.08, 0.06, 2.8, rail, { ry: -0.1 });
    this.box(this.staticGroup, x + 0.28, 0.08, z, 0.08, 0.06, 2.8, rail, { ry: -0.1 });
    for (let i = -1; i <= 1; i += 1) this.box(this.staticGroup, x, 0.075, z + i * 0.82, 1.0, 0.05, 0.12, tie, { ry: -0.1 });
  }

  private forageClue(x: number, z: number): void {
    const leaf = this.mats.get('forage-clue-leaf', '#8fb75a');
    const soil = this.mats.get('forage-clue-soil', '#4b3824');
    this.box(this.staticGroup, x, 0.055, z, 0.82, 0.035, 0.42, soil, { ry: 0.35 });
    this.box(this.staticGroup, x - 0.18, 0.17, z + 0.04, 0.18, 0.22, 0.08, leaf, { ry: 0.2 });
    this.box(this.staticGroup, x + 0.16, 0.18, z - 0.08, 0.16, 0.24, 0.08, leaf, { ry: -0.32 });
    this.mushrooms(x + 0.42, z + 0.28);
  }

  private cryptReferenceDressing(): void {
    this.sarcophagus(-2, 8);
    this.sarcophagus(9, -7);
    this.cryptAltar(0, -8);
    for (const [x, z] of [
      [-4, 2],
      [2, -2],
      [7, 5],
      [-10, 7],
      [11, -2]
    ] as Array<[number, number]>) this.crackedFloorCluster(x, z);
    for (const [x, z] of [
      [-8, -4],
      [5, -6],
      [0, 10]
    ] as Array<[number, number]>) this.torchPool(x, z);
  }

  private sarcophagus(x: number, z: number): void {
    const stone = this.mats.get('sarcophagus-stone', '#5d5952');
    const lid = this.mats.get('sarcophagus-lid', '#6b665e');
    this.box(this.staticGroup, x, 0.28, z, 1.15, 0.46, 2.15, stone, { ry: 0.12 });
    this.box(this.staticGroup, x, 0.62, z, 0.92, 0.22, 1.82, lid, { ry: 0.12 });
    this.box(this.staticGroup, x, 0.78, z - 0.42, 0.42, 0.08, 0.08, this.mats.get('sarcophagus-mark', '#a08d5a'), { ry: 0.12 });
  }

  private cryptAltar(x: number, z: number): void {
    const base = this.mats.get('crypt-altar-base', '#46413c');
    const glow = this.mats.get('crypt-altar-glow', '#7ad7ff', { emissive: '#4bbcff', emissiveIntensity: 0.45, transparent: true, opacity: 0.74 });
    this.box(this.staticGroup, x, 0.32, z, 1.9, 0.55, 1.05, base);
    this.box(this.staticGroup, x, 0.72, z, 1.35, 0.2, 0.72, this.mats.get('crypt-altar-slab', '#5b554e'));
    this.box(this.staticGroup, x, 0.9, z, 0.38, 0.12, 0.38, glow, { ry: 0.4 });
    this.candle(x - 0.75, z + 0.38);
    this.candle(x + 0.75, z + 0.38);
  }

  private cryptPedestal(x: number, z: number): void {
    const base = this.mats.get('crypt-pedestal-base', '#44413d');
    const trim = this.mats.get('crypt-pedestal-trim', '#8f7750', { metalness: 0.12, roughness: 0.65 });
    this.box(this.staticGroup, x, 0.18, z, 2.15, 0.34, 1.55, base);
    this.box(this.staticGroup, x, 0.43, z, 1.72, 0.16, 1.16, this.mats.get('crypt-pedestal-top', '#5d5952'));
    this.box(this.staticGroup, x, 0.56, z - 0.58, 1.45, 0.08, 0.08, trim);
    this.box(this.staticGroup, x, 0.56, z + 0.58, 1.45, 0.08, 0.08, trim);
  }

  private hiddenNiche(x: number, z: number): void {
    const stone = this.mats.get('crypt-niche-stone', '#4b4844');
    const dark = this.mats.get('crypt-niche-shadow', '#11100f');
    this.box(this.staticGroup, x, 0.85, z, 1.45, 1.2, 0.28, stone);
    this.box(this.staticGroup, x, 0.88, z - 0.16, 0.92, 0.72, 0.08, dark);
    this.candle(x - 0.36, z - 0.32);
    this.candle(x + 0.36, z - 0.32);
    this.box(this.staticGroup, x, 1.35, z - 0.18, 0.38, 0.18, 0.22, this.mats.get('crypt-niche-skull', '#b8b09a'));
  }

  private cryptLever(x: number, z: number): void {
    const metal = this.mats.get('crypt-lever-metal', '#6f6a61', { metalness: 0.35, roughness: 0.5 });
    const handle = this.mats.get('crypt-lever-handle', '#8b5a2b');
    this.box(this.staticGroup, x, 0.5, z, 0.55, 0.72, 0.22, this.mats.get('crypt-lever-plate', '#3b3936'));
    this.box(this.staticGroup, x + 0.05, 0.88, z - 0.04, 0.12, 0.78, 0.12, metal, { rz: -0.5 });
    this.box(this.staticGroup, x + 0.24, 1.2, z - 0.04, 0.22, 0.22, 0.22, handle);
  }

  private falseCryptDoor(x: number, z: number): void {
    const stone = this.mats.get('false-crypt-door-stone', '#504d48');
    const crack = this.mats.get('false-crypt-door-crack', '#141414');
    this.box(this.staticGroup, x, 0.95, z, 1.5, 1.45, 0.22, stone);
    this.box(this.staticGroup, x, 1.18, z - 0.14, 0.08, 0.94, 0.06, crack, { rz: 0.22 });
    this.box(this.staticGroup, x - 0.34, 0.82, z - 0.16, 0.08, 0.46, 0.06, crack, { rz: -0.18 });
    this.candle(x - 0.7, z - 0.4);
  }

  private cryptFloorRune(x: number, z: number): void {
    const glow = this.mats.get('crypt-floor-rune-glow', '#7ad7ff', { emissive: '#4bbcff', emissiveIntensity: 0.28, transparent: true, opacity: 0.42 });
    this.box(this.staticGroup, x, 0.065, z, 1.25, 0.035, 0.08, glow, { ry: 0.4 });
    this.box(this.staticGroup, x, 0.068, z, 0.08, 0.035, 1.25, glow, { ry: 0.4 });
    this.box(this.staticGroup, x, 0.071, z, 0.78, 0.035, 0.08, glow, { ry: -0.38 });
  }

  private crackedFloorCluster(x: number, z: number): void {
    const crack = this.mats.get('crypt-floor-crack-deep', '#121212');
    this.box(this.staticGroup, x, 0.055, z, 0.9, 0.035, 0.06, crack, { ry: 0.4 });
    this.box(this.staticGroup, x + 0.24, 0.058, z + 0.16, 0.48, 0.035, 0.055, crack, { ry: -0.32 });
    this.box(this.staticGroup, x - 0.3, 0.058, z - 0.1, 0.42, 0.035, 0.05, crack, { ry: 1.05 });
  }

  private torchPool(x: number, z: number): void {
    const glow = this.mats.get('crypt-torch-pool', '#ff8e39', { transparent: true, opacity: 0.16, emissive: '#ff8e39', emissiveIntensity: 0.2 });
    this.box(this.staticGroup, x, 0.052, z, 3.0, 0.03, 3.0, glow);
  }

  private clearGroup(group: THREE.Object3D): void {
    const children = [...group.children];
    children.forEach((child) => {
      group.remove(child);
      this.disposeObject(child);
    });
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry && !mesh.geometry.userData.sharedBox) mesh.geometry.dispose();
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if (material.userData.runtimeAssetMaterial) material.dispose();
        });
      }
    });
  }

  private collectObjectStats(): {
    meshCount: number;
    staticMeshCount: number;
    entityMeshCount: number;
    effectMeshCount: number;
    instancedMeshCount: number;
    instancedInstanceCount: number;
    materialCount: number;
    geometryCount: number;
  } {
    const materials = new Set<string>();
    const geometries = new Set<number>();
    let instancedMeshCount = 0;
    let instancedInstanceCount = 0;
    const countGroup = (group: THREE.Object3D) => {
      let count = 0;
      group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        count += 1;
        geometries.add(child.geometry.id);
        const materialList = Array.isArray(child.material) ? child.material : [child.material];
        materialList.forEach((material) => materials.add(material.uuid));
        if (child instanceof THREE.InstancedMesh) {
          instancedMeshCount += 1;
          instancedInstanceCount += child.count;
        }
      });
      return count;
    };
    const staticMeshCount = countGroup(this.staticGroup);
    const entityMeshCount = countGroup(this.entityGroup);
    const effectMeshCount = countGroup(this.effectGroup) + countGroup(this.ghostGroup);
    return {
      meshCount: staticMeshCount + entityMeshCount + effectMeshCount,
      staticMeshCount,
      entityMeshCount,
      effectMeshCount,
      instancedMeshCount,
      instancedInstanceCount,
      materialCount: materials.size,
      geometryCount: geometries.size
    };
  }

  private countPickableMeshes(): number {
    return this.collectPickableMeshes().length;
  }

  private collectPickableMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.records.forEach((record) => {
      record.group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.primaryPickTarget) meshes.push(child);
      });
    });
    return meshes;
  }

  private markPrimaryPickTargets(group: THREE.Group): void {
    group.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    const volumes: number[] = [];
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.userData.primaryPickTarget = false;
      box.setFromObject(child);
      box.getSize(size);
      meshes.push(child);
      volumes.push(size.x * size.y * size.z);
    });
    selectPrimaryPickTargetIndexes(volumes).forEach((index) => {
      meshes[index].userData.primaryPickTarget = true;
    });
  }

  private readMemoryMb(): number | null {
    const maybeMemory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
    if (!maybeMemory?.usedJSHeapSize) return null;
    return Math.round((maybeMemory.usedJSHeapSize / 1024 / 1024) * 10) / 10;
  }
}

function smoothAngle(current: number, target: number, alpha: number): number {
  const delta = ((((target - current) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return current + delta * alpha;
}
