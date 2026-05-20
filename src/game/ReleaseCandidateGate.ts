export type ReleaseCandidateGateId =
  | 'internal-alpha-scope'
  | 'movement-lock'
  | 'portal-stuck'
  | 'cpu-acceptable'
  | 'tooltip-stability'
  | 'save-load'
  | 'ui-reset'
  | 'movement-modes-persist'
  | 'spellbook'
  | 'inventory-equipment'
  | 'hotbar'
  | 'profession-atlas'
  | 'first-hour-route'
  | 'normal-mode-dev-buttons'
  | 'crash-free-session'
  | 'known-issues'
  | 'feedback-loop'
  | 'telemetry-summary'
  | 'scope-freeze';

export type ReleaseCandidateGateSeverity = 'blocker' | 'major';

export interface ReleaseCandidateGateInput {
  internalAlphaScope: boolean;
  noKnownMovementLock: boolean;
  noCommonPortalStuckBug: boolean;
  cpuAcceptable: boolean;
  noTooltipFlicker: boolean;
  stableSaveLoad: boolean;
  uiResetWorks: boolean;
  movementModesPersist: boolean;
  spellbookUsable: boolean;
  inventoryEquipmentStateVisible: boolean;
  hotbarAssignmentWorks: boolean;
  professionAtlasUsable: boolean;
  firstHourRoutePlayable: boolean;
  noDevButtonsInNormalMode: boolean;
  crashFreeSixtyMinuteSession: boolean;
  knownIssuesDocumented: boolean;
  feedbackLoopReady: boolean;
  telemetrySummaryReady: boolean;
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
    id: 'internal-alpha-scope',
    label: 'Internal alpha scope matches prompt',
    inputKey: 'internalAlphaScope',
    severity: 'blocker',
    nextStep: 'Keep the tester build to one region, first-hour route, MVP depth systems, housing Tier 0-1, readable combat, and stable UI/performance.'
  },
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
    id: 'cpu-acceptable',
    label: 'CPU acceptable',
    inputKey: 'cpuAcceptable',
    severity: 'blocker',
    nextStep: 'Run the perf/UI gate and browser smoke; fix frame, draw-call, or DOM churn regressions before testers receive the build.'
  },
  {
    id: 'tooltip-stability',
    label: 'No tooltip flicker',
    inputKey: 'noTooltipFlicker',
    severity: 'blocker',
    nextStep: 'Run tooltip stability and DOM rendering budget checks; tooltip anchors must not remount repeatedly during common UI use.'
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
    id: 'movement-modes-persist',
    label: 'Movement modes persist',
    inputKey: 'movementModesPersist',
    severity: 'blocker',
    nextStep: 'Switch keyboard, mouse, and hybrid movement modes, save/load, and confirm the selected mode survives migration.'
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
    id: 'profession-atlas',
    label: 'Profession Atlas usable',
    inputKey: 'professionAtlasUsable',
    severity: 'blocker',
    nextStep: 'Open Skills, use the Profession Atlas tab, select nodes, pin goals, and confirm the graph stays readable.'
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
    nextStep: 'Keep INTERNAL_ALPHA_NOTES.md current with known issues, severity, workaround, and playtest blocker status.'
  },
  {
    id: 'feedback-loop',
    label: 'Feedback loop ready',
    inputKey: 'feedbackLoopReady',
    severity: 'major',
    nextStep: 'Prepare survey questions, bug report template, and debug/telemetry export instructions.'
  },
  {
    id: 'telemetry-summary',
    label: 'Telemetry summary ready',
    inputKey: 'telemetrySummaryReady',
    severity: 'major',
    nextStep: 'Document which telemetry counters testers should export and how to attach them to feedback.'
  },
  {
    id: 'scope-freeze',
    label: 'Scope frozen for playtest',
    inputKey: 'scopeFrozen',
    severity: 'major',
    nextStep: 'Reject major systems until the internal alpha test is complete; allow only blocker fixes and low-risk tuning.'
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
    return `Internal alpha release candidate is ready. ${report.passed.length} gate(s) passed.`;
  }

  const blockers = report.failed.filter((gate) => gate.severity === 'blocker').length;
  const majors = report.failed.filter((gate) => gate.severity === 'major').length;
  return `Blocked: ${report.failed.length} gate(s) still need work. Blockers: ${blockers}. Major: ${majors}.`;
}
