import * as THREE from 'three';
import type { GameState } from './types';

export class CameraController {
  private zoom = 17;
  private desiredZoom = 17;
  private width = 1280;
  private height = 720;
  private focus = new THREE.Vector3();
  private offset = new THREE.Vector3(8.6, 10.2, 8.6);

  constructor(private camera: THREE.OrthographicCamera) {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.applyProjection();
  }

  getZoom(): number {
    return this.zoom;
  }

  getDebugState(): { focus: { x: number; y: number; z: number }; offset: { x: number; y: number; z: number }; desiredZoom: number } {
    return {
      focus: { x: this.focus.x, y: this.focus.y, z: this.focus.z },
      offset: { x: this.offset.x, y: this.offset.y, z: this.offset.z },
      desiredZoom: this.desiredZoom
    };
  }

  screenMoveToWorldVector(dx: number, dz: number): { x: number; z: number } {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const world = right.multiplyScalar(dx).add(forward.multiplyScalar(-dz));
    const len = Math.hypot(world.x, world.z) || 1;
    return { x: world.x / len, z: world.z / len };
  }

  private applyProjection(): void {
    const aspect = this.width / Math.max(1, this.height);
    this.camera.left = (-this.zoom * aspect) / 2;
    this.camera.right = (this.zoom * aspect) / 2;
    this.camera.top = this.zoom / 2;
    this.camera.bottom = -this.zoom / 2;
    this.camera.updateProjectionMatrix();
  }

  setZoom(delta: number): void {
    this.zoom = THREE.MathUtils.clamp(this.zoom + delta, 11, 24);
    this.applyProjection();
  }

  update(state: GameState, alpha = 0.12): void {
    const player = state.player.position;
    const baseFocus = new THREE.Vector3(player.x, player.y + 0.1, player.z);
    const velocity = state.player.movement.velocity;
    const speed = Math.hypot(velocity.x, velocity.z);
    if (speed > 0.05) {
      baseFocus.x += (velocity.x / speed) * 1.15;
      baseFocus.z += (velocity.z / speed) * 1.15;
    }

    const target = state.player.activeTargetId ? state.entities[state.player.activeTargetId] : null;
    if (target?.kind === 'enemy' && target.area === state.player.currentArea && target.state !== 'dead') {
      const targetFocus = new THREE.Vector3(target.position.x, target.position.y + 0.1, target.position.z);
      baseFocus.lerp(targetFocus, THREE.MathUtils.clamp(0.18 + baseFocus.distanceTo(targetFocus) / 42, 0.22, 0.42));
    }

    this.focus.lerp(baseFocus, alpha);
    this.offset = this.offsetForArea(state);
    this.desiredZoom = this.zoomForArea(state);
    if (Math.abs(this.zoom - this.desiredZoom) > 0.02) {
      this.zoom = THREE.MathUtils.lerp(this.zoom, this.desiredZoom, alpha);
      this.applyProjection();
    }
    const desired = this.focus.clone().add(this.offset);
    this.camera.position.lerp(desired, alpha);
    this.camera.lookAt(this.focus);
  }

  private offsetForArea(state: GameState): THREE.Vector3 {
    if (state.player.currentArea === 'bank' || state.player.currentArea === 'blacksmith') return new THREE.Vector3(6.7, 8.2, 6.7);
    if (state.player.currentArea === 'crypt') return new THREE.Vector3(7.4, 8.8, 7.4);
    return new THREE.Vector3(8.6, 10.2, 8.6);
  }

  private zoomForArea(state: GameState): number {
    let maxZoom = 24;
    if (state.player.currentArea === 'bank' || state.player.currentArea === 'blacksmith') maxZoom = 14.5;
    if (state.player.currentArea === 'crypt') maxZoom = 15.5;
    if (state.player.activeTargetId) maxZoom = Math.min(maxZoom, 17.5);
    return THREE.MathUtils.clamp(this.zoom, 11, maxZoom);
  }
}
