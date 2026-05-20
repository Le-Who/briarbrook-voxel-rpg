import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { addItem } from '../systems/InventorySystem';
import { TreasureMapPanel } from './TreasureMapPanel';

describe('treasure map panel', () => {
  it('renders selectable tiered treasure leads without turning the map into a static image', () => {
    const state = createInitialGameState();
    state.ui.panels.treasureMap = true;
    state.ui.selectedTreasureMapId = 'old_river_bandit_stash';
    addItem(state.player.inventory, 'rough_treasure_map', 1);
    state.world.treasure.maps.old_river_bandit_stash.fragmentCount = 3;
    state.world.treasure.maps.old_river_bandit_stash.decipheredPrecision = 0.76;
    state.world.treasure.maps.crypt_reliquary.fragmentCount = 3;

    const html = TreasureMapPanel(state);

    expect(html).toContain('data-treasure-map-id="greymont_cache"');
    expect(html).toContain('data-treasure-map-id="old_river_bandit_stash"');
    expect(html).toContain('data-treasure-map-id="crypt_reliquary"');
    expect(html).toContain('Tier 2');
    expect(html).toContain('Old River Road');
    expect(html).toContain('76% precision');
    expect(html).toContain('data-action="decipher-map"');
    expect(html).toContain('data-action="pin-map"');
    expect(html).toContain('data-map-waypoint-source="treasure"');
  });
});
