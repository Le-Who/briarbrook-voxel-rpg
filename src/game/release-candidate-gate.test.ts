import { describe, expect, it } from 'vitest';
import type { ReleaseCandidateGateInput } from './ReleaseCandidateGate';
import { evaluateReleaseCandidateGate, formatReleaseCandidateGateSummary } from './ReleaseCandidateGate';

const passingGate: ReleaseCandidateGateInput = {
  noKnownMovementLock: true,
  noCommonPortalStuckBug: true,
  stableSaveLoad: true,
  uiResetWorks: true,
  spellbookUsable: true,
  inventoryEquipmentStateVisible: true,
  hotbarAssignmentWorks: true,
  firstHourRoutePlayable: true,
  noDevButtonsInNormalMode: true,
  crashFreeSixtyMinuteSession: true,
  knownIssuesDocumented: true,
  feedbackLoopReady: true,
  scopeFrozen: true
};

describe('release candidate gate', () => {
  it('passes only when every external playtest gate is satisfied', () => {
    const report = evaluateReleaseCandidateGate(passingGate);

    expect(report.ready).toBe(true);
    expect(report.failed).toEqual([]);
    expect(report.gates.map((gate) => gate.id)).toEqual([
      'movement-lock',
      'portal-stuck',
      'save-load',
      'ui-reset',
      'spellbook',
      'inventory-equipment',
      'hotbar',
      'first-hour-route',
      'normal-mode-dev-buttons',
      'crash-free-session',
      'known-issues',
      'feedback-loop',
      'scope-freeze'
    ]);
    expect(formatReleaseCandidateGateSummary(report)).toContain('External playtest candidate is ready.');
  });

  it('blocks release when common first-hour or UI checks are missing', () => {
    const report = evaluateReleaseCandidateGate({
      ...passingGate,
      noKnownMovementLock: false,
      uiResetWorks: false,
      firstHourRoutePlayable: false,
      knownIssuesDocumented: false
    });

    expect(report.ready).toBe(false);
    expect(report.failed.map((gate) => gate.id)).toEqual(['movement-lock', 'ui-reset', 'first-hour-route', 'known-issues']);
    expect(formatReleaseCandidateGateSummary(report)).toContain('Blocked: 4 gate(s) still need work.');
  });

  it('keeps feedback and scope freeze visible as required playtest preparation', () => {
    const report = evaluateReleaseCandidateGate({
      ...passingGate,
      feedbackLoopReady: false,
      scopeFrozen: false
    });

    expect(report.ready).toBe(false);
    expect(report.failed).toEqual([
      expect.objectContaining({ id: 'feedback-loop', severity: 'major' }),
      expect.objectContaining({ id: 'scope-freeze', severity: 'major' })
    ]);
  });

  it('points missing documentation gates at the release-candidate artifacts', () => {
    const report = evaluateReleaseCandidateGate({
      ...passingGate,
      knownIssuesDocumented: false,
      feedbackLoopReady: false
    });

    expect(report.failed.find((gate) => gate.id === 'known-issues')?.nextStep).toContain('KNOWN_ISSUES.md');
    expect(report.failed.find((gate) => gate.id === 'feedback-loop')?.nextStep).toContain('survey questions');
  });
});
