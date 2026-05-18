import { describe, expect, it } from 'vitest';
import audit from '../../UI_AUDIT.md?raw';
import design from '../../DESIGN_SYSTEM.md?raw';

describe('UI design system documents', () => {
  it('keeps the UI audit and design system ready for follow-up refactors', () => {
    expect(audit).toContain('## Information Hierarchy');
    expect(audit).toContain('## Combat Availability');
    expect(audit).toContain('## Compact And Advanced Modes');
    expect(audit).toContain('## Refactor Targets');

    expect(design).toContain('## Design Tokens');
    expect(design).toContain('## UI Modes');
    expect(design).toContain('## Component State Rules');
    expect(design).toContain('## Z-Index Layers');
  });
});
