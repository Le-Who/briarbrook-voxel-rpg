import { describe, expect, it } from 'vitest';
import externalPlaytestGate from '../../EXTERNAL_PLAYTEST_GATE.md?raw';
import internalAlphaNotes from '../../INTERNAL_ALPHA_NOTES.md?raw';
import knownIssues from '../../KNOWN_ISSUES.md?raw';
import playtestFeedback from '../../PLAYTEST_FEEDBACK.md?raw';
import type { ReleaseCandidateGateInput } from './ReleaseCandidateGate';
import { evaluateReleaseCandidateGate, formatReleaseCandidateGateSummary } from './ReleaseCandidateGate';

const passingGate: ReleaseCandidateGateInput = {
  internalAlphaScope: true,
  noKnownMovementLock: true,
  noCommonPortalStuckBug: true,
  cpuAcceptable: true,
  noTooltipFlicker: true,
  stableSaveLoad: true,
  uiResetWorks: true,
  movementModesPersist: true,
  spellbookUsable: true,
  inventoryEquipmentStateVisible: true,
  hotbarAssignmentWorks: true,
  professionAtlasUsable: true,
  firstHourRoutePlayable: true,
  noDevButtonsInNormalMode: true,
  crashFreeSixtyMinuteSession: true,
  knownIssuesDocumented: true,
  feedbackLoopReady: true,
  telemetrySummaryReady: true,
  scopeFrozen: true
};

describe('release candidate gate', () => {
  it('passes only when every internal alpha gate is satisfied', () => {
    const report = evaluateReleaseCandidateGate(passingGate);

    expect(report.ready).toBe(true);
    expect(report.failed).toEqual([]);
    expect(report.gates.map((gate) => gate.id)).toEqual([
      'internal-alpha-scope',
      'movement-lock',
      'portal-stuck',
      'cpu-acceptable',
      'tooltip-stability',
      'save-load',
      'ui-reset',
      'movement-modes-persist',
      'spellbook',
      'inventory-equipment',
      'hotbar',
      'profession-atlas',
      'first-hour-route',
      'normal-mode-dev-buttons',
      'crash-free-session',
      'known-issues',
      'feedback-loop',
      'telemetry-summary',
      'scope-freeze'
    ]);
    expect(formatReleaseCandidateGateSummary(report)).toContain('Internal alpha release candidate is ready.');
  });

  it('blocks release when common first-hour or UI checks are missing', () => {
    const report = evaluateReleaseCandidateGate({
      ...passingGate,
      noKnownMovementLock: false,
      cpuAcceptable: false,
      noTooltipFlicker: false,
      uiResetWorks: false,
      movementModesPersist: false,
      firstHourRoutePlayable: false,
      knownIssuesDocumented: false
    });

    expect(report.ready).toBe(false);
    expect(report.failed.map((gate) => gate.id)).toEqual(['movement-lock', 'cpu-acceptable', 'tooltip-stability', 'ui-reset', 'movement-modes-persist', 'first-hour-route', 'known-issues']);
    expect(formatReleaseCandidateGateSummary(report)).toContain('Blocked: 7 gate(s) still need work.');
  });

  it('keeps feedback and scope freeze visible as required playtest preparation', () => {
    const report = evaluateReleaseCandidateGate({
      ...passingGate,
      feedbackLoopReady: false,
      telemetrySummaryReady: false,
      scopeFrozen: false
    });

    expect(report.ready).toBe(false);
    expect(report.failed).toEqual([
      expect.objectContaining({ id: 'feedback-loop', severity: 'major' }),
      expect.objectContaining({ id: 'telemetry-summary', severity: 'major' }),
      expect.objectContaining({ id: 'scope-freeze', severity: 'major' })
    ]);
  });

  it('points missing documentation gates at the release-candidate artifacts', () => {
    const report = evaluateReleaseCandidateGate({
      ...passingGate,
      knownIssuesDocumented: false,
      feedbackLoopReady: false
    });

    expect(report.failed.find((gate) => gate.id === 'known-issues')?.nextStep).toContain('INTERNAL_ALPHA_NOTES.md');
    expect(report.failed.find((gate) => gate.id === 'feedback-loop')?.nextStep).toContain('survey questions');
  });

  it('ships internal alpha notes with scope, controls, test flow, feedback, and known issues', () => {
    const notes = internalAlphaNotes;

    expect(notes).toContain('What Is In');
    expect(notes).toContain('What Is Not In');
    expect(notes).toContain('Known Issues');
    expect(notes).toContain('Controls');
    expect(notes).toContain('How To Test');
    expect(notes).toContain('Bug Report Template');
    expect(notes).toContain('Save Export Instructions');
    expect(notes).toContain('Questionnaire');
    expect(notes).toContain('Telemetry Summary');
    expect(notes).toContain('one region');
    expect(notes).toContain('not public marketing');
  });

  it('keeps the known-issues ledger actionable for external playtest decisions', () => {
    expect(knownIssues).toContain('| Issue | Severity | Owner | Reproduction / evidence note | Workaround | Blocks Playtest |');
    expect(knownIssues).toContain('60-minute crash-free session');
    expect(knownIssues).toContain('Release director / QA operator');
    expect(knownIssues).toContain('Blocks Playtest');
  });

  it('keeps the playtest feedback form ready for tester reports', () => {
    expect(playtestFeedback).toContain('Post-Play Survey');
    expect(playtestFeedback).toContain('Bug Report Template');
    expect(playtestFeedback).toContain('Debug Info To Attach');
    expect(playtestFeedback).toContain('Build label:');
    expect(playtestFeedback).toContain('Debug export attached:');
  });

  it('keeps the external playtest gate explicit about blockers and exit criteria', () => {
    expect(externalPlaytestGate).toContain('Required Checks');
    expect(externalPlaytestGate).toContain('A 60-minute session is crash-free');
    expect(externalPlaytestGate).toContain('Known issues are triaged in `KNOWN_ISSUES.md`');
    expect(externalPlaytestGate).toContain('Feedback collection is ready through `PLAYTEST_FEEDBACK.md`');
    expect(externalPlaytestGate).toContain('P0: crashes');
    expect(externalPlaytestGate).toContain('No P0/P1 issues are open');
  });
});
