export const housingBuildReferencePlan = {
  referenceId: 'R7',
  phase14ReferenceIds: ['REF_145_PLAYER_PLOT_BUILD', 'REF_136_BUILD_MODE_SPATIAL'],
  scene: ['visible plot boundary', 'modest fence', 'road approach', 'water and dock', 'starter objects'],
  compositionZones: ['fenced-plot', 'build-grid', 'starter-garden', 'utility-staging', 'ghost-placement'],
  spatialUi: ['left palette', 'right inspector', 'bottom action bar', 'world ghost', 'ground footprint'],
  buildTabs: ['Walls', 'Floors', 'Doors', 'Roofs', 'Decor', 'Utility/Storage'],
  feedback: ['valid ghost', 'invalid ghost', 'footprint', 'collision warning', 'material shortage warning', 'orientation arrow'],
  starterFunctionalPieces: ['small_chest', 'basic_workbench', 'torch', 'bedroll_home', 'resource_crate', 'small_trophy_hook'],
  constraints: ['inside owned plot only', 'path remains open', 'no storage duplication', 'materials consumed on placement']
} as const;
