import { describe, expect, it } from 'vitest';
import { audioCueCatalog } from '../audio/AudioManager';
import { audioVolumeCategories } from '../audio/AudioSettings';
import { createInitialGameState } from '../game/GameState';
import { createAccessibilityCertificationReport, accessibilityChecklistIds, localizationChecklistIds, newPlayerClarityIds } from './AccessibilityCertification';

describe('accessibility, localization, and new-player certification', () => {
  it('certifies every accessibility checklist item for the default build', () => {
    const report = createAccessibilityCertificationReport(createInitialGameState());

    expect(report.failures).toEqual([]);
    expect(report.accessibility.map((check) => check.id)).toEqual(accessibilityChecklistIds);
    expect(report.accessibility.every((check) => check.status === 'pass')).toBe(true);
    expect(audioVolumeCategories).toContain('combatAlert');
    expect(Object.values(audioCueCatalog).filter((cue) => cue.critical).every((cue) => cue.visualSubstitute.length > 0)).toBe(true);
  });

  it('certifies the core new-player clarity surfaces', () => {
    const report = createAccessibilityCertificationReport(createInitialGameState());

    expect(report.failures).toEqual([]);
    expect(report.newPlayer.map((check) => check.id)).toEqual(newPlayerClarityIds);
    expect(report.newPlayer.every((check) => check.status === 'pass')).toBe(true);
    expect(report.evidence.missingSpellRequirement).toContain('sulfurous_ash');
    expect(report.evidence.treeTargeting).toContain('Chop');
    expect(report.evidence.invalidTreeTargeting).toContain('pickaxe');
  });

  it('certifies localization readiness and long-text stress coverage', () => {
    const report = createAccessibilityCertificationReport(createInitialGameState());

    expect(report.failures).toEqual([]);
    expect(report.localization.map((check) => check.id)).toEqual(localizationChecklistIds);
    expect(report.localization.every((check) => check.status === 'pass')).toBe(true);
    expect(report.localizationKeys).toContain('error.missingReagents');
    expect(report.textStress.longestExpansionRatio).toBeGreaterThan(1.1);
    expect(report.iconTextAudit.embeddedTextElements).toEqual([]);
  });
});
