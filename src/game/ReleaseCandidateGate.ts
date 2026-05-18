export type ReleaseCandidateGateId =
  | 'movement-lock'
  | 'portal-stuck'
  | 'save-load'
  | 'ui-reset'
  | 'spellbook'
  | 'inventory-equipment'
  | 'hotbar'
  | 'first-hour-route'
  | 'normal-mode-dev-buttons'
  | 'crash-free-session'
  | 'known-issues'
  | 'feedback-loop'
  | 'scope-freeze';

export type ReleaseCandidateGateSeverity = 'blocker' | 'major';

export interface ReleaseCandidateGateInput {
  noKnownMovementLock: boolean;
  noCommonPortalStuckBug: boolean;
  stableSaveLoad: boolean;
  uiResetWorks: boolean;
  spellbookUsable: boolean;
  inventoryEquipmentStateVisible: boolean;
  hotbarAssignmentWorks: boolean;
  firstHourRoutePlayable: boolean;
  noDevButtonsInNormalMode: boolean;
  crashFreeSixtyMinuteSession: boolean;
  knownIssuesDocumented: boolean;
  feedbackLoopReady: boolean;
  scopeFrozen: boolean;
}

export interface ReleaseCandidateGateResult {
  id: ReleaseCandidateGateId;
  label: string;
  passed: boolean;
  severity: ReleaseCandidateGateSeverity;
  nextStep: string;
}

export interface ReleaseCandidateGateReport {
  ready: boolean;
  passed: ReleaseCandidateGateResult[];
  failed: ReleaseCandidateGateResult[];
  gates: ReleaseCandidateGateResult[];
}

const gateDefinitions: Array<{
  id: ReleaseCandidateGateId;
  label: string;
  inputKey: keyof ReleaseCandidateGateInput;
  severity: ReleaseCandidateGateSeverity;
  nextStep: string;
}> = [
  {
    id: 'movement-lock',
    label: 'No known movement lock',
    inputKey: 'noKnownMovementLock',
    severity: 'blocker',
    nextStep: 'Reproduce movement, click-to-move, combat approach, casting, and UI focus before releasing.'
  },
  {
    id: 'portal-stuck',
    label: 'No common portal stuck bug',
    inputKey: 'noCommonPortalStuckBug',
    severity: 'blocker',
    nextStep: 'Run portal transitions and fallback recovery until no common stuck case remains.'
  },
  {
    id: 'save-load',
    label: 'Stable save/load',
    inputKey: 'stableSaveLoad',
    severity: 'blocker',
    nextStep: 'Verify new and migrated saves can resume with UI, inventory, quests, map, and telemetry intact.'
  },
  {
    id: 'ui-reset',
    label: 'UI reset works',
    inputKey: 'uiResetWorks',
    severity: 'blocker',
    nextStep: 'Open, drag, scroll, resize, reset layout, then confirm windows recover without flicker or stuck scroll.'
  },
  {
    id: 'spellbook',
    label: 'Spellbook usable',
    inputKey: 'spellbookUsable',
    severity: 'blocker',
    nextStep: 'Cast a known spell, trigger one invalid cast, and confirm actionable feedback.'
  },
  {
    id: 'inventory-equipment',
    label: 'Inventory and equipment state visible',
    inputKey: 'inventoryEquipmentStateVisible',
    severity: 'blocker',
    nextStep: 'Equip, unequip, compare item state, and confirm paperdoll/world visuals remain readable.'
  },
  {
    id: 'hotbar',
    label: 'Hotbar assignment works',
    inputKey: 'hotbarAssignmentWorks',
    severity: 'blocker',
    nextStep: 'Assign an item, spell, tool, and action to hotbar slots, then activate them by key.'
  },
  {
    id: 'first-hour-route',
    label: 'First-hour route playable',
    inputKey: 'firstHourRoutePlayable',
    severity: 'blocker',
    nextStep: 'Run the starter route through controls, gathering, combat, healing, objective following, and one work order or quest.'
  },
  {
    id: 'normal-mode-dev-buttons',
    label: 'No dev buttons in normal mode',
    inputKey: 'noDevButtonsInNormalMode',
    severity: 'blocker',
    nextStep: 'Inspect normal-mode HUD, help, panels, and overlays for debug-only controls.'
  },
  {
    id: 'crash-free-session',
    label: 'Crash-free 60-minute session',
    inputKey: 'crashFreeSixtyMinuteSession',
    severity: 'blocker',
    nextStep: 'Complete a 60-minute soak or documented equivalent before external testers receive the build.'
  },
  {
    id: 'known-issues',
    label: 'Known issues documented',
    inputKey: 'knownIssuesDocumented',
    severity: 'blocker',
    nextStep: 'Keep KNOWN_ISSUES.md current with issue, severity, workaround, and playtest blocker status.'
  },
  {
    id: 'feedback-loop',
    label: 'Feedback loop ready',
    inputKey: 'feedbackLoopReady',
    severity: 'major',
    nextStep: 'Prepare survey questions, bug report template, and debug/telemetry export instructions.'
  },
  {
    id: 'scope-freeze',
    label: 'Scope frozen for playtest',
    inputKey: 'scopeFrozen',
    severity: 'major',
    nextStep: 'Reject major systems until the external playtest is complete; allow only blocker fixes and low-risk tuning.'
  }
];

export function evaluateReleaseCandidateGate(input: ReleaseCandidateGateInput): ReleaseCandidateGateReport {
  const gates = gateDefinitions.map<ReleaseCandidateGateResult>((gate) => ({
    id: gate.id,
    label: gate.label,
    passed: Boolean(input[gate.inputKey]),
    severity: gate.severity,
    nextStep: gate.nextStep
  }));
  const failed = gates.filter((gate) => !gate.passed);

  return {
    ready: failed.length === 0,
    passed: gates.filter((gate) => gate.passed),
    failed,
    gates
  };
}

export function formatReleaseCandidateGateSummary(report: ReleaseCandidateGateReport): string {
  if (report.ready) {
    return `External playtest candidate is ready. ${report.passed.length} gate(s) passed.`;
  }

  const blockers = report.failed.filter((gate) => gate.severity === 'blocker').length;
  const majors = report.failed.filter((gate) => gate.severity === 'major').length;
  return `Blocked: ${report.failed.length} gate(s) still need work. Blockers: ${blockers}. Major: ${majors}.`;
}
