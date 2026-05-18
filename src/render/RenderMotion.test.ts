import { describe, expect, it } from 'vitest';
import { RenderMotionTracker } from './RenderMotion';

describe('RenderMotionTracker', () => {
  it('interpolates between previous and current fixed-tick transforms', () => {
    const tracker = new RenderMotionTracker();

    tracker.sample('player', { position: { x: 0, y: 0, z: 0 }, facing: 0, snapKey: 'town' }, 1, 1);
    const midpoint = tracker.sample('player', { position: { x: 2, y: 0, z: 0 }, facing: Math.PI, snapKey: 'town' }, 2, 0.5);

    expect(midpoint.position.x).toBeCloseTo(1, 4);
    expect(midpoint.facing).toBeGreaterThan(0);
    expect(midpoint.facing).toBeLessThan(Math.PI);
  });

  it('snaps instead of interpolating huge area-transition jumps', () => {
    const tracker = new RenderMotionTracker({ snapDistance: 4 });

    tracker.sample('player', { position: { x: 0, y: 0, z: 0 }, facing: 0, snapKey: 'town' }, 1, 1);
    const afterTransition = tracker.sample('player', { position: { x: 20, y: 0, z: 20 }, facing: 1, snapKey: 'forest' }, 2, 0.2);

    expect(afterTransition.position.x).toBe(20);
    expect(afterTransition.position.z).toBe(20);
    expect(afterTransition.facing).toBe(1);
  });
});
