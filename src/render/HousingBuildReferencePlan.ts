export const housingBuildReferencePlan = {
  referenceId: 'R7',
  scene: ['visible plot boundary', 'modest fence', 'road approach', 'water and dock', 'starter objects'],
  buildTabs: ['Walls', 'Floors', 'Doors', 'Roofs', 'Decor', 'Utility/Storage'],
  feedback: ['valid ghost', 'invalid ghost', 'footprint', 'collision warning', 'material shortage warning', 'orientation arrow'],
  starterFunctionalPieces: ['small_chest', 'basic_workbench', 'torch', 'bedroll_home', 'resource_crate', 'small_trophy_hook'],
  constraints: ['inside owned plot only', 'path remains open', 'no storage duplication', 'materials consumed on placement']
} as const;
