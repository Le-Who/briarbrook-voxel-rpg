import { describe, expect, it } from 'vitest';
import nextPillarMatrix from '../../NEXT_PILLAR_MATRIX.md?raw';

const candidates = [
  'Treasure Hunting expansion',
  'Housing Tier 2-3',
  'Local economy depth',
  'Living world events expansion',
  'Reputation/crime',
  'Multiplayer town room',
  'Multiplayer dungeon instance',
  'Pets/taming',
  'Second region',
  'Advanced crafting/quality',
  'Procedural contracts',
  'Guild/social systems'
];

const criteria = [
  'Strengthens current identity',
  'Uses existing systems',
  'Player value',
  'Implementation cost',
  'Bug risk',
  'Content burden',
  'Performance risk',
  'Multiplayer dependency',
  'First-hour relevance',
  'Long-term retention'
];

describe('next pillar decision matrix', () => {
  it('covers every requested candidate and scoring criterion', () => {
    candidates.forEach((candidate) => expect(nextPillarMatrix).toContain(candidate));
    criteria.forEach((criterion) => expect(nextPillarMatrix).toContain(criterion));
    expect(nextPillarMatrix).toContain('5 = favorable');
  });

  it('makes an evidence-based choice with scope and constraints', () => {
    expect(nextPillarMatrix).toContain('Chosen Pillar');
    expect(nextPillarMatrix).toContain('Treasure Hunting expansion');
    expect(nextPillarMatrix).toContain('Why Now');
    expect(nextPillarMatrix).toContain('Why Not The Rest');
    expect(nextPillarMatrix).toContain('MVP Scope');
    expect(nextPillarMatrix).toContain('Explicit Non-Goals');
    expect(nextPillarMatrix).toContain('Kill Criteria');
    expect(nextPillarMatrix).toContain('Success Metrics');
  });

  it('keeps multiplayer, second region, and pets delayed until the solo loop is proven', () => {
    expect(nextPillarMatrix).toContain('Delay multiplayer');
    expect(nextPillarMatrix).toContain('Delay second region');
    expect(nextPillarMatrix).toContain('Delay pets/taming');
  });
});
