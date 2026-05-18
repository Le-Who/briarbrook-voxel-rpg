import type { Vec3 } from '../game/types';

export interface RenderMotionTransform {
  position: Vec3;
  facing?: number;
  snapKey?: string;
}

export interface RenderMotionSample {
  position: Vec3;
  facing: number;
}

interface RenderMotionEntry {
  tick: number;
  snapKey?: string;
  previous: Required<RenderMotionTransform>;
  current: Required<RenderMotionTransform>;
}

export class RenderMotionTracker {
  private entries = new Map<string, RenderMotionEntry>();
  private snapDistance: number;

  constructor(options: { snapDistance?: number } = {}) {
    this.snapDistance = options.snapDistance ?? 7.5;
  }

  clear(): void {
    this.entries.clear();
  }

  forgetMissing(visibleIds: Set<string>): void {
    for (const id of this.entries.keys()) {
      if (!visibleIds.has(id)) this.entries.delete(id);
    }
  }

  sample(id: string, transform: RenderMotionTransform, tick: number, alpha: number): RenderMotionSample {
    const normalized = normalizeTransform(transform);
    const existing = this.entries.get(id);
    if (!existing || existing.snapKey !== normalized.snapKey || distance(existing.current.position, normalized.position) > this.snapDistance) {
      const seeded = { tick, snapKey: normalized.snapKey, previous: cloneTransform(normalized), current: cloneTransform(normalized) };
      this.entries.set(id, seeded);
      return { position: { ...normalized.position }, facing: normalized.facing };
    }

    if (tick !== existing.tick) {
      existing.previous = cloneTransform(existing.current);
      existing.current = cloneTransform(normalized);
      existing.tick = tick;
      existing.snapKey = normalized.snapKey;
    } else {
      existing.current = cloneTransform(normalized);
    }

    const t = clamp(alpha, 0, 1);
    return {
      position: {
        x: lerp(existing.previous.position.x, existing.current.position.x, t),
        y: lerp(existing.previous.position.y, existing.current.position.y, t),
        z: lerp(existing.previous.position.z, existing.current.position.z, t)
      },
      facing: lerpAngle(existing.previous.facing, existing.current.facing, t)
    };
  }
}

function normalizeTransform(transform: RenderMotionTransform): Required<RenderMotionTransform> {
  return {
    position: { ...transform.position },
    facing: transform.facing ?? 0,
    snapKey: transform.snapKey ?? 'world'
  };
}

function cloneTransform(transform: Required<RenderMotionTransform>): Required<RenderMotionTransform> {
  return {
    position: { ...transform.position },
    facing: transform.facing,
    snapKey: transform.snapKey
  };
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let delta = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (Math.abs(delta + Math.PI) < 0.000001) delta = Math.PI;
  return a + delta * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
