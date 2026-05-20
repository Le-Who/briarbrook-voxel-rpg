import { describe, expect, it } from 'vitest';
import { consumeReactRenderCounts, recordReactPanelRender } from '../components/renderMetrics';

describe('React render metrics', () => {
  it('records panel render counts with React-prefixed perf ids', () => {
    consumeReactRenderCounts();

    recordReactPanelRender('hotbar');
    recordReactPanelRender('hotbar');
    recordReactPanelRender('spellbook');

    expect(consumeReactRenderCounts()).toEqual({
      'react:hotbar': 2,
      'react:spellbook': 1
    });
    expect(consumeReactRenderCounts()).toEqual({});
  });
});
