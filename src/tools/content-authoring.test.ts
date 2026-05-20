import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { CONTENT_VALIDATE_COMMAND, createContentAuthoringReport, detectDeadReferences, previewItem, previewRecipe, previewSpell } from './ContentAuthoringTools';
import { createContentRegistry, type ContentRegistry } from './ContentRegistry';
import { validateContent } from './ContentValidation';

describe('data-driven content authoring tools', () => {
  it('validates shipped authoring domains beyond core gameplay data', () => {
    const registry = createContentRegistry(createInitialGameState());
    const result = validateContent(registry);

    expect(registry.professions.clusters.length).toBeGreaterThan(0);
    expect(registry.professions.milestones.length).toBeGreaterThan(0);
    expect(registry.events.length).toBeGreaterThan(0);
    expect(registry.mapMarkers.length).toBeGreaterThan(0);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('catches broken profession, work-order, event, and map-marker references', () => {
    const registry = createContentRegistry(createInitialGameState());
    const firstProfession = registry.professions.clusters[0];
    const firstMilestone = registry.professions.milestones[0];
    const firstWorkOrder = registry.economy.workOrders[0];

    const broken: ContentRegistry = {
      ...registry,
      professions: {
        ...registry.professions,
        clusters: [
          {
            ...firstProfession,
            nodes: [
              ...firstProfession.nodes,
              {
                id: 'bad_tool_node',
                type: 'tool',
                label: 'Broken Tool',
                description: 'Intentional broken reference for validator coverage.',
                x: 0,
                y: 0,
                ref: 'missing_tool_item'
              }
            ],
            edges: [...firstProfession.edges, { from: 'bad_tool_node', to: 'missing_node', type: 'requires', label: 'broken edge' }]
          },
          ...registry.professions.clusters.slice(1)
        ],
        milestones: [
          ...registry.professions.milestones,
          {
            ...firstMilestone,
            id: 'bad_mastery',
            professionId: 'missing_profession' as never,
            requirements: [{ type: 'spellKnown', spellId: 'missing_spell' }],
            visibleWhen: [{ type: 'itemOwned', itemId: 'missing_item', quantity: 1 }]
          }
        ]
      },
      economy: {
        ...registry.economy,
        workOrders: [
          ...registry.economy.workOrders,
          {
            ...firstWorkOrder,
            id: 'bad_work_order',
            rewardRecipeIds: ['missing_recipe'],
            rewardVoucherItems: [{ itemId: 'missing_voucher', quantity: 1 }],
            rewardDiscount: { label: 'Bad Discount', category: 'missing_category' as never, percent: 5, duration: 12 }
          }
        ]
      },
      events: [
        ...registry.events,
        {
          ...registry.events[0],
          type: 'bandit_ambush',
          area: 'missing_event_area' as never,
          affectedLocations: ['road', 'missing_event_area' as never],
          position: { x: 0, y: 0, z: 0 }
        }
      ],
      mapMarkers: [...registry.mapMarkers, { id: 'bad_marker', areaId: 'missing_marker_area' as never, label: '', position: { x: 0, y: 0, z: 0 }, source: 'objective' }]
    };

    const errors = validateContent(broken).errors.join('\n');

    expect(errors).toContain('profession armsman node bad_tool_node');
    expect(errors).toContain('missing_tool_item');
    expect(errors).toContain('profession armsman edge bad_tool_node -> missing_node');
    expect(errors).toContain('mastery bad_mastery');
    expect(errors).toContain('missing_spell');
    expect(errors).toContain('work order bad_work_order.rewardRecipeIds');
    expect(errors).toContain('missing_voucher');
    expect(errors).toContain('missing_category');
    expect(errors).toContain('event bandit_ambush.area');
    expect(errors).toContain('map marker bad_marker');
  });

  it('previews item, spell, recipe, localization keys, and dead-reference report output', () => {
    const registry = createContentRegistry(createInitialGameState());
    const report = createContentAuthoringReport(registry, 1234);

    expect(previewItem(registry, 'iron_sword')?.id).toBe('iron_sword');
    expect(previewSpell(registry, 'magic_arrow')?.reagents.length).toBeGreaterThan(0);
    expect(previewRecipe(registry, 'iron_sword')?.inputs.length).toBeGreaterThan(0);
    expect(report.validation.ok).toBe(true);
    expect(report.counts.items).toBeGreaterThan(0);
    expect(report.previewSamples.items.some((item) => item.id === 'iron_sword')).toBe(true);
    expect(report.localizationKeys).toContain('content.item.iron_sword.name');
    expect(report.localizationKeys).toContain('content.profession.armsman.title');
    expect(detectDeadReferences(registry)).toEqual([]);
  });

  it('exposes a project-local content validation command', () => {
    expect(CONTENT_VALIDATE_COMMAND).toBe('node tools/content-validate.mjs');
  });
});
