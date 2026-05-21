import { useMemo, type MouseEvent, type ReactElement } from 'react';
import { areas } from '../../../data/areas';
import { itemDefs } from '../../../data/items';
import { type ProfessionCluster, type ProfessionNode, professionClusters, professionContracts } from '../../../data/professions';
import { recipes } from '../../../data/recipes';
import { skillDefinitionById } from '../../../data/skillDefinitions';
import { spellDefs } from '../../../data/spells';
import type { GameAction } from '../../../game/Actions';
import type { AreaId, MapLayerId, ProfessionLensFilter, Vec3 } from '../../../game/types';
import type { GameUICommandResult } from '../bridge/commands';
import type { GameUISnapshot } from '../bridge/selectors';
import { useReactPanelRender } from '../components/renderMetrics';
import { ActionFooter, Badge, DetailPane, EmptyState, IconButton, PanelTabs, PanelToolbar, ScrollArea, SplitPane, StatusRow, Text } from '../components/primitives';
import { useGameCommand, useGameSnapshot } from '../hooks/useGameSnapshot';

type DispatchAction = (action: GameAction) => GameUICommandResult;
type PlanningTab = 'ledger' | 'atlas' | 'mastery';

const primaryLensIds = ['armsman', 'ranger', 'hedge_mage', 'treasure_hunter', 'healer', 'smith_artisan', 'builder', 'naturalist'];
const professionLensAliases: Record<string, string> = {
  town_smith: 'smith_artisan',
  field_medic: 'healer',
  provisioner: 'naturalist'
};
const trainableSkillIds = new Set([
  'Swordsmanship',
  'Fencing',
  'Mace Fighting',
  'Archery',
  'Tactics',
  'Anatomy',
  'Parrying',
  'Healing',
  'Focus',
  'Alchemy',
  'Blacksmithing',
  'Carpentry',
  'Bowcraft/Fletching',
  'Tailoring',
  'Tinkering',
  'Inscription',
  'Cooking',
  'Cartography',
  'Arms Lore',
  'Item Identification',
  'Magery',
  'Meditation',
  'Resisting Spells',
  'Hiding',
  'Stealth',
  'Lockpicking',
  'Detect Hidden',
  'Remove Trap',
  'Poisoning',
  'Lumberjacking',
  'Mining',
  'Fishing',
  'Survival',
  'Musicianship',
  'Peacemaking',
  'Provocation',
  'Discordance'
]);

const layerOrder: MapLayerId[] = ['terrain', 'player', 'companions', 'services', 'objective', 'pinned', 'danger', 'entrances', 'housing'];
const layerLabels: Record<MapLayerId, string> = {
  terrain: 'Terrain',
  player: 'Player',
  companions: 'Companions',
  services: 'Services',
  objective: 'Objectives',
  pinned: 'Pinned',
  danger: 'Danger',
  entrances: 'Entrances',
  housing: 'Housing'
};

const areaPositions: Partial<Record<AreaId, { x: number; y: number; code: string }>> = {
  town: { x: 50, y: 42, code: 'BB' },
  bank: { x: 43, y: 40, code: 'BK' },
  blacksmith: { x: 57, y: 40, code: 'SM' },
  forest: { x: 35, y: 22, code: 'FR' },
  road: { x: 68, y: 47, code: 'RD' },
  crypt: { x: 76, y: 20, code: 'CR' },
  housing: { x: 24, y: 66, code: 'HM' }
};

interface MapMarker {
  id: string;
  layer: MapLayerId;
  areaId: AreaId;
  label: string;
  detail: string;
  x: number;
  y: number;
  code: string;
  cluster?: string;
  waypoint?: Vec3;
}

export function PlanningWorkspaces(): ReactElement {
  const snapshot = useGameSnapshot((next) => next);
  const commands = useGameCommand();
  return <PlanningWorkspacesSurfaces snapshot={snapshot} dispatchAction={commands.dispatchAction} />;
}

export function PlanningWorkspacesSurfaces({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  const showAtlas = snapshot.windows.panels.skills;
  const showMap = snapshot.windows.panels.map || snapshot.map.mode === 'expanded';

  return (
    <>
      {showAtlas ? <ProfessionAtlasWorkspace snapshot={snapshot} dispatchAction={dispatchAction} /> : null}
      {showMap ? <AdventureMapWorkspace snapshot={snapshot} dispatchAction={dispatchAction} /> : null}
    </>
  );
}

function ProfessionAtlasWorkspace({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('skills');
  const tab = activePlanningTab(snapshot);
  const lenses = useMemo(() => primaryLensIds.map((id) => professionClusters.find((cluster) => cluster.id === id)).filter(Boolean) as ProfessionCluster[], []);
  const selected = selectProfession(snapshot, lenses);
  const isAtlas = tab === 'atlas';

  return (
    <section className="bb-planning-workspace bb-profession-workspace" data-react-panel="skills" data-ui-window="true" data-planning-workspace="profession-atlas" data-atlas-layout={isAtlas ? 'reference-138' : undefined}>
      <WorkspaceHeader
        title={isAtlas ? 'Profession Atlas' : 'Skills'}
        subtitle={isAtlas ? '' : tab === 'mastery' ? 'Mastery' : 'Skill Ledger'}
        actions={<IconButton label="Close skills" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_PANEL', panel: 'skills', open: false })}>x</IconButton>}
      />
      {!isAtlas ? <PanelTabs
        className="bb-planning-tabs"
        tabs={[
          { id: 'ledger', label: 'Skills' },
          { id: 'atlas', label: 'Profession Atlas' },
          { id: 'mastery', label: 'Mastery' }
        ]}
        activeId={tab}
        onSelect={(id) => dispatchAction({ type: 'SET_SKILL_VIEW', view: id as PlanningTab })}
      /> : null}
      {tab === 'atlas' ? <AtlasWorkspaceBody snapshot={snapshot} dispatchAction={dispatchAction} lenses={lenses} selected={selected} /> : <SkillWorkspaceBody snapshot={snapshot} tab={tab} dispatchAction={dispatchAction} />}
    </section>
  );
}

function AtlasWorkspaceBody({ snapshot, dispatchAction, lenses, selected }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction; lenses: ProfessionCluster[]; selected: ProfessionCluster }): ReactElement {
  const search = snapshot.professions.search.trim().toLowerCase();
  const visibleNodes = selected.nodes.filter((node) => (snapshot.professions.showFuture || isImplementedNode(node)) && (!search || nodeSearchText(node).includes(search)));
  const selectedNode = visibleNodes.find((node) => node.id === snapshot.professions.selectedNodeId) ?? visibleNodes[0] ?? selected.nodes[0];
  const contracts = professionContracts.filter((contract) => contract.professionId === selected.id);
  const pathwayCards = search ? visibleNodes.map((node) => ({ kind: 'node' as const, node })) : [...visibleNodes.map((node) => ({ kind: 'node' as const, node })), { kind: 'next' as const }];

  return (
    <SplitPane
      className="bb-planning-split bb-planning-split--atlas"
      data-atlas-renderer="pathway-cards"
      start={
        <ScrollArea className="bb-planning-sidebar" data-atlas-zone="lenses">
          <Text as="strong" tone="accent">Profession lenses</Text>
          <div className="bb-lens-list">
            {lenses.map((lens) => (
              <button className={lens.id === selected.id ? 'is-active' : ''} type="button" key={lens.id} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_SKILL_PROFESSION_FILTER', filter: lens.id as ProfessionLensFilter })}>
                <b>{lens.title}</b>
                <span>{lens.skills.slice(0, 3).join(', ')}</span>
              </button>
            ))}
          </div>
          <Text as="strong" tone="accent">Contracts</Text>
          <div className="bb-contract-strip" data-atlas-zone="contracts">
            {contracts.map((contract) => (
              <button className={snapshot.professions.activeContractId === contract.id ? 'is-active' : ''} type="button" key={contract.id} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'ACCEPT_PROFESSION_CONTRACT', contractId: contract.id })}>
                <b>{contract.title}</b>
                <span>{contract.skills.length} skills</span>
              </button>
            ))}
            {contracts.length === 0 ? <Text tone="muted">No contracts for this lens yet.</Text> : null}
          </div>
        </ScrollArea>
      }
      end={<ProfessionDetailPane snapshot={snapshot} profession={selected} node={selectedNode} dispatchAction={dispatchAction} />}
    >
      <PanelToolbar className="bb-planning-toolbar">
        <input className="bb-react-search" aria-label="Search profession atlas" value={snapshot.professions.search} placeholder="Search pathway" onChange={(event) => dispatchAction({ type: 'SET_PROFESSION_ATLAS_SEARCH', search: event.target.value })} />
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_PROFESSION_ATLAS_ZOOM', zoom: 0.85 })}>Fit</button>
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_PROFESSION_ATLAS_ZOOM', zoom: 1 })}>Reset</button>
        <button type="button" className={snapshot.professions.showFuture ? 'is-active' : ''} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_PROFESSION_ATLAS_SHOW_FUTURE', show: !snapshot.professions.showFuture })}>
          {snapshot.professions.showFuture ? 'Hide Locked' : 'Show Locked'}
        </button>
      </PanelToolbar>
      <div className="bb-atlas-center-head">
        <Text as="h3" tone="accent">{selected.title}</Text>
        <Text as="p" size="sm" tone="muted">{selected.summary}</Text>
      </div>
      <ScrollArea className="bb-pathway-card-scroll" data-atlas-zone="pathways" data-atlas-pathway-grid="cards" data-atlas-relationship-cues="directional" data-atlas-empty-darkness="false">
        <div className="bb-pathway-card-grid">
          {pathwayCards.map((card, index) => {
            if (card.kind === 'next') {
              return (
                <button className="bb-pathway-card bb-pathway-card--next" type="button" key="next-step" data-node-type="next" data-atlas-card="next-step" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'PIN_PROFESSION_GOAL', goalId: selectedNode?.id ?? selected.id })}>
                  <span>Next step</span>
                  <b>Next Goal</b>
                  <small>{selected.suggestedGoal}</small>
                  <Badge tone="muted">Ready</Badge>
                </button>
              );
            }
            const { node } = card;
            return (
              <button className={`bb-pathway-card ${node.id === selectedNode.id ? 'is-selected' : ''} ${isImplementedNode(node) ? '' : 'is-future'}`.trim()} type="button" key={node.id} data-node-type={nodeKind(node)} data-atlas-card={node.id} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_PROFESSION_ATLAS_NODE', nodeId: node.id })}>
                <span>{nodeKindLabel(node)}</span>
                <b>{node.label}</b>
                <small>{node.description}</small>
                <Badge tone={isImplementedNode(node) ? 'success' : 'muted'}>{isImplementedNode(node) ? 'Available' : 'Locked'}</Badge>
                {index < pathwayCards.length - 1 ? <i className="bb-pathway-cue" aria-hidden="true">→</i> : null}
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <ActionFooter className="bb-planning-footer">
        <Text tone="accent">{selected.title}</Text>
        <Text tone="muted">{selected.suggestedGoal}</Text>
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'PIN_PROFESSION_GOAL', goalId: selectedNode?.id ?? selected.id })}>Pin Goal</button>
      </ActionFooter>
    </SplitPane>
  );
}

function SkillWorkspaceBody({ snapshot, tab, dispatchAction }: { snapshot: GameUISnapshot; tab: PlanningTab; dispatchAction: DispatchAction }): ReactElement {
  const rows = snapshot.skills.rows.slice(0, 18);
  const selectedLens = snapshot.professions.clusters.find((cluster) => cluster.id === snapshot.professions.filter);
  return (
    <SplitPane
      className="bb-planning-split bb-planning-split--summary"
      start={
        <ScrollArea className="bb-planning-sidebar">
          <Text as="strong" tone="accent">Skill groups</Text>
          <div className="bb-lens-list">
            {snapshot.professions.clusters.slice(0, 8).map((cluster) => (
              <button type="button" key={cluster.id} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_SKILL_PROFESSION_FILTER', filter: cluster.id as ProfessionLensFilter })}>
                <b>{cluster.title}</b>
                <span>{cluster.skillIds.slice(0, 3).join(', ')}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      }
      end={
        <DetailPane title={tab === 'mastery' ? 'Mastery Planning' : 'Skill Detail'}>
          <StatusRow label="Selected lens" value={selectedLens?.title ?? 'All'} />
          <StatusRow label="Mode" value={tab === 'mastery' ? 'Milestones' : 'Ledger'} />
          <Text as="p" size="sm" tone="muted">Choose a profession lens to see useful skills, tools, outputs, services, and next goals.</Text>
        </DetailPane>
      }
    >
      <ScrollArea className="bb-skill-summary-list">
        {rows.map((row) => (
          <article className="bb-skill-summary-row" key={row.id}>
            <b>{row.name}</b>
            <span>{row.group}</span>
            <em>{row.value.toFixed(1)} / {row.mode}</em>
          </article>
        ))}
      </ScrollArea>
    </SplitPane>
  );
}

function ProfessionDetailPane({ snapshot, profession, node, dispatchAction }: { snapshot: GameUISnapshot; profession: ProfessionCluster; node: ProfessionNode | undefined; dispatchAction: DispatchAction }): ReactElement {
  const nodeLabel = node?.label ?? profession.title;
  const nodeSkillId = node?.type === 'skill' ? node.ref : undefined;
  const nodeSpellId = node?.type === 'spell' ? node.ref : undefined;
  const nodeAvailable = node ? isImplementedNode(node) : true;
  const activities = profession.nodes.filter((candidate) => candidate.type === 'action' || candidate.type === 'spell').map((candidate) => candidate.label).join(', ') || 'Practice in the world';
  const outputs = profession.nodes.filter((candidate) => candidate.type === 'output' || candidate.type === 'recipe').map((candidate) => candidate.label).join(', ') || 'Progress';
  const milestone = profession.nodes.find((candidate) => candidate.type === 'milestone')?.label ?? 'No milestone yet';
  const unlocks = profession.nodes
    .filter((candidate) => candidate.type === 'milestone' || candidate.type === 'service' || candidate.type === 'station')
    .map((candidate) => candidate.label)
    .slice(0, 3)
    .join(', ') || 'Path to milestones and contracts';

  return (
    <DetailPane title={nodeLabel} className="bb-profession-detail" data-atlas-detail="true" data-atlas-zone="detail">
      <ScrollArea className="bb-profession-detail-scroll" key={node?.id ?? profession.id}>
        <section className="bb-atlas-detail-section" data-atlas-detail-section="goal">
          <Text as="strong" tone="accent">Goal</Text>
          <Text as="p" size="sm" tone="muted">{node?.description ?? profession.suggestedGoal}</Text>
          <Badge tone={nodeAvailable ? 'success' : 'muted'}>{nodeAvailable ? 'Available' : 'Locked'}</Badge>
        </section>
        <section className="bb-atlas-detail-section" data-atlas-detail-section="unlocks">
          <Text as="strong" tone="accent">Unlocks</Text>
          <Text as="p" size="sm" tone="muted">{unlocks}</Text>
        </section>
        <section className="bb-atlas-detail-section" data-atlas-detail-section="skill-mix">
          <Text as="strong" tone="accent">Skill mix</Text>
          <Text as="p" size="sm" tone="muted">{profession.skills.slice(0, 5).join(', ')}</Text>
        </section>
        <section className="bb-atlas-detail-section" data-atlas-detail-section="activities">
          <Text as="strong" tone="accent">Activities</Text>
          <Text as="p" size="sm" tone="muted">{activities}</Text>
        </section>
        <section className="bb-atlas-detail-section" data-atlas-detail-section="outputs">
          <Text as="strong" tone="accent">Outputs</Text>
          <Text as="p" size="sm" tone="muted">{outputs}</Text>
        </section>
        <section className="bb-atlas-detail-section" data-atlas-detail-section="next-step">
          <Text as="strong" tone="accent">Next step</Text>
          <Text as="p" size="sm" tone="muted">{profession.suggestedGoal}</Text>
        </section>
        <div className="bb-detail-actions" data-atlas-detail-section="actions">
          {node ? <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'PIN_PROFESSION_GOAL', goalId: node.id })}>Pin Goal</button> : null}
          {nodeSkillId ? <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_SKILL_SEARCH', search: nodeSkillId })}>Open Skill</button> : null}
          {nodeSpellId ? <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SELECT_SPELL', spellId: nodeSpellId })}>Open Spell</button> : null}
          <Badge tone={snapshot.professions.pinnedGoalId === node?.id ? 'info' : 'muted'}>{snapshot.professions.pinnedGoalId === node?.id ? 'Pinned' : 'Not pinned'}</Badge>
        </div>
      </ScrollArea>
    </DetailPane>
  );
}

function AdventureMapWorkspace({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('map');
  const markers = buildAdventureMarkers(snapshot);
  const hidden = new Set(snapshot.map.hiddenLayers);
  const visibleMarkers = markers.filter((marker) => !hidden.has(marker.layer));
  const selected = visibleMarkers.find((marker) => marker.areaId === snapshot.map.currentArea) ?? visibleMarkers[0];
  const services = visibleMarkers.filter((marker) => marker.cluster === 'services');
  const danger = visibleMarkers.filter((marker) => marker.layer === 'danger');
  const entrances = visibleMarkers.filter((marker) => marker.layer === 'entrances');
  const housing = visibleMarkers.filter((marker) => marker.layer === 'housing');
  const plottedMarkers = services.length ? visibleMarkers.filter((marker) => marker.cluster !== 'services') : visibleMarkers;

  return (
    <section className="bb-planning-workspace bb-adventure-map-workspace" data-react-panel="map" data-ui-window="true" data-planning-workspace="adventure-map" data-map-label-mode="icons-and-clusters">
      <WorkspaceHeader
        title="Adventure Map"
        subtitle={snapshot.map.currentAreaName}
        actions={<IconButton label="Close map" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_MINIMAP_MODE', mode: 'standard' })}>x</IconButton>}
      />
      <PanelToolbar className="bb-planning-toolbar">
        {layerOrder.map((layer) => (
          <button className={hidden.has(layer) ? 'is-muted' : 'is-active'} type="button" key={layer} data-map-layer-toggle={layer} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_MAP_LAYER', layerId: layer })}>
            {layerLabels[layer]}
          </button>
        ))}
      </PanelToolbar>
      <SplitPane
        className="bb-planning-split bb-planning-split--map"
        end={<MapDetailPane snapshot={snapshot} marker={selected} dispatchAction={dispatchAction} />}
      >
        <div className="bb-adventure-map-canvas" aria-label="Adventure map canvas">
          <span className="bb-map-road bb-map-road--forest" />
          <span className="bb-map-road bb-map-road--road" />
          <span className="bb-map-road bb-map-road--housing" />
          {services.length ? (
            <button className="bb-map-marker bb-map-marker--cluster" type="button" data-map-cluster="services" data-map-layer="services" style={{ left: '50%', top: '31%' }} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_MAP_WAYPOINT', areaId: 'town', position: { x: 0, y: 0, z: 0 }, label: 'Town services', source: 'manual' })}>
              SV
            </button>
          ) : null}
          {plottedMarkers.map((marker) => (
            <button className={`bb-map-marker bb-map-marker--${marker.layer}`} type="button" key={marker.id} data-map-marker={marker.id} data-map-layer={marker.layer} style={{ left: `${marker.x}%`, top: `${marker.y}%` }} title={marker.label} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_MAP_WAYPOINT', areaId: marker.areaId, position: marker.waypoint ?? { x: 0, y: 0, z: 0 }, label: marker.label, source: 'manual' })}>
              {marker.code}
            </button>
          ))}
        </div>
        <div className="bb-map-bottom-cards">
          <MapIntelCard title="Entrances" markers={entrances} />
          <MapIntelCard title="Danger" markers={danger} />
          <MapIntelCard title="Housing" markers={housing} />
        </div>
      </SplitPane>
    </section>
  );
}

function MapDetailPane({ snapshot, marker, dispatchAction }: { snapshot: GameUISnapshot; marker: MapMarker | undefined; dispatchAction: DispatchAction }): ReactElement {
  return (
    <DetailPane title={marker?.label ?? 'Map Detail'} className="bb-map-detail-pane">
      <StatusRow label="Current area" value={snapshot.map.currentAreaName} />
      <StatusRow label="Discovered" value={snapshot.map.discoveredAreas.length} />
      <StatusRow label="Waypoint" value={snapshot.map.waypoint?.label ?? 'None'} />
      <StatusRow label="Selected" value={marker?.detail ?? 'Choose a marker'} />
      {marker ? <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_MAP_WAYPOINT', areaId: marker.areaId, position: marker.waypoint ?? { x: 0, y: 0, z: 0 }, label: marker.label, source: 'manual' })}>Pin Route</button> : null}
      {snapshot.map.waypoint ? <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'CLEAR_MAP_WAYPOINT' })}>Clear Route</button> : null}
    </DetailPane>
  );
}

function MapIntelCard({ title, markers }: { title: string; markers: MapMarker[] }): ReactElement {
  return (
    <article className="bb-map-intel-card">
      <b>{title}</b>
      {markers.length ? markers.slice(0, 3).map((marker) => <span key={marker.id}>{marker.label}</span>) : <span>None discovered</span>}
    </article>
  );
}

function WorkspaceHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions: ReactElement }): ReactElement {
  return (
    <header className="bb-planning-header" data-bb-fixed="header">
      <div>
        <Text as="h2" size="lg" tone="accent">{title}</Text>
        {subtitle ? <Text size="sm" tone="muted">{subtitle}</Text> : null}
      </div>
      {actions}
    </header>
  );
}

function activePlanningTab(snapshot: GameUISnapshot): PlanningTab {
  if (snapshot.skills.view === 'mastery') return 'mastery';
  if (snapshot.skills.view === 'atlas') return 'atlas';
  return 'ledger';
}

function selectProfession(snapshot: GameUISnapshot, lenses: ProfessionCluster[]): ProfessionCluster {
  const filter = snapshot.professions.filter === 'all' ? snapshot.professions.clusters[0]?.id : snapshot.professions.filter;
  const normalized = filter ? professionLensAliases[filter] ?? filter : filter;
  return lenses.find((lens) => lens.id === normalized) ?? lenses[0] ?? professionClusters[0];
}

function isImplementedNode(node: ProfessionNode): boolean {
  if (node.type === 'future') return false;
  if (node.type === 'skill') return trainableSkillIds.has(node.ref ?? node.label);
  if (node.type === 'tool' || node.type === 'resource' || node.type === 'output') return Boolean(node.ref && itemDefs[node.ref]);
  if (node.type === 'spell') return Boolean(node.ref && spellDefs[node.ref]);
  if (node.type === 'recipe') return Boolean(node.ref && recipes.some((recipe) => recipe.id === node.ref));
  return !/future|later|not yet/i.test(node.description);
}

function nodeKind(node: ProfessionNode): string {
  if (!isImplementedNode(node)) return 'future';
  if (node.type === 'spell' || node.type === 'action') return 'activity';
  if (node.type === 'recipe') return 'output';
  if (node.type === 'station') return 'service';
  return node.type;
}

function nodeKindLabel(node: ProfessionNode): string {
  const kind = nodeKind(node);
  if (kind === 'future') return 'Locked';
  return kind === 'skill' && node.ref ? `${skillDefinitionById[node.ref]?.group ?? 'Skill'}` : kind.replaceAll('_', ' ');
}

function nodeSearchText(node: ProfessionNode): string {
  return `${node.label} ${node.description} ${node.type} ${node.ref ?? ''}`.toLowerCase();
}

function buildAdventureMarkers(snapshot: GameUISnapshot): MapMarker[] {
  const known = new Set<AreaId>([snapshot.map.currentArea, ...snapshot.map.discoveredAreas]);
  const markers: MapMarker[] = [];

  known.forEach((areaId) => {
    const position = areaPositions[areaId];
    if (!position) return;
    markers.push({
      id: `region:${areaId}`,
      layer: areaId === 'crypt' ? 'danger' : areaId === 'housing' ? 'housing' : 'terrain',
      areaId,
      label: areas[areaId]?.name ?? areaId,
      detail: areaId === snapshot.map.currentArea ? 'Current area' : 'Discovered area',
      x: position.x,
      y: position.y,
      code: position.code
    });
  });

  if (known.has('town') || known.has('bank') || known.has('blacksmith')) {
    markers.push({ id: 'service:town', layer: 'services', areaId: 'town', label: 'Town services', detail: 'Bank, smithy, trainers, and local boards.', x: 50, y: 38, code: 'SV', cluster: 'services' });
  }
  if (known.has('forest')) markers.push({ id: 'entrance:mine', layer: 'entrances', areaId: 'forest', label: 'Mine trail', detail: 'Forest route toward ore and crypt pressure.', x: 44, y: 18, code: 'MN' });
  if (known.has('road')) markers.push({ id: 'danger:road', layer: 'danger', areaId: 'road', label: 'Road danger', detail: 'Bandit pressure and escort risks.', x: 70, y: 53, code: '!' });
  if (snapshot.map.waypoint) {
    const base = areaPositions[snapshot.map.waypoint.areaId] ?? areaPositions.town!;
    markers.push({ id: 'waypoint:manual', layer: 'objective', areaId: snapshot.map.waypoint.areaId, label: snapshot.map.waypoint.label, detail: 'Pinned route waypoint.', x: base.x + 3, y: base.y + 3, code: 'WP', waypoint: snapshot.map.waypoint.position });
  }
  snapshot.journal.rumors.slice(0, 3).forEach((rumor, index) => {
    const base = areaPositions[rumor.area] ?? areaPositions.town!;
    markers.push({ id: `rumor:${rumor.id}`, layer: rumor.type === 'bandit_ambush' || rumor.type === 'crypt_spill' ? 'danger' : 'pinned', areaId: rumor.area, label: rumor.title, detail: rumor.rumor, x: base.x + 4 + index * 3, y: base.y - 4 - index * 2, code: 'R', waypoint: rumor.position ?? undefined });
  });

  return markers;
}

function dispatchClick(event: MouseEvent<HTMLElement>, dispatchAction: DispatchAction, action: GameAction): GameUICommandResult {
  event.preventDefault();
  event.stopPropagation();
  return dispatchAction(action);
}
