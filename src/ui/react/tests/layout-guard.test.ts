import { describe, expect, it } from 'vitest';
import { reactLayoutWarningsForObservations, type ReactLayoutGuardObservation } from '../components/layoutGuard';

function observation(patch: Partial<ReactLayoutGuardObservation> & Pick<ReactLayoutGuardObservation, 'id'>): ReactLayoutGuardObservation {
  return {
    id: patch.id,
    rect: patch.rect ?? { x: 16, y: 16, width: 320, height: 240 },
    overflows: patch.overflows ?? false,
    hasScrollArea: patch.hasScrollArea ?? true,
    clippedTextCount: patch.clippedTextCount ?? 0,
    tooltipOutsideOverlay: patch.tooltipOutsideOverlay ?? false,
    overlapsHotbar: patch.overlapsHotbar ?? false
  };
}

describe('React layout guard warnings', () => {
  it('flags common anti-overlap policy violations', () => {
    const warnings = reactLayoutWarningsForObservations(
      [
        observation({ id: 'spellbook', overflows: true, hasScrollArea: false }),
        observation({ id: 'journal', clippedTextCount: 2 }),
        observation({ id: 'tooltip', tooltipOutsideOverlay: true }),
        observation({ id: 'map', rect: { x: -12, y: 8, width: 320, height: 240 } }),
        observation({ id: 'chat', overlapsHotbar: true })
      ],
      { viewport: { width: 1366, height: 768 } }
    );

    expect(warnings).toContain('spellbook overflows without a ScrollArea.');
    expect(warnings).toContain('journal has 2 clipped text nodes.');
    expect(warnings).toContain('tooltip is not mounted in the tooltip overlay root.');
    expect(warnings).toContain('map is outside the viewport.');
    expect(warnings).toContain('chat overlaps the hotbar safe area.');
  });
});
