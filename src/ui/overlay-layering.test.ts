import { describe, expect, it } from 'vitest';

declare function require(moduleName: string): { readFileSync: (path: URL, encoding: string) => string };

const { readFileSync } = require('fs');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function zIndexFor(selector: string): number {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{[^}]*z-index:\\s*([^;]+);`, 'm'));
  if (!match) throw new Error(`Missing z-index for ${selector}`);
  const value = match[1].trim();
  if (/^[0-9]+$/.test(value)) return Number(value);
  throw new Error(`Non-numeric z-index for ${selector}: ${value}`);
}

describe('overlay layering contract', () => {
  it('keeps item context menus above React windows', () => {
    expect(zIndexFor('.context-menu')).toBeGreaterThan(zIndexFor('.react-ui-layer'));
    expect(zIndexFor('.bb-context-menu-portal')).toBeGreaterThan(zIndexFor('.react-ui-layer'));
    expect(zIndexFor('.context-menu')).toBeGreaterThan(zIndexFor('.hotbar-assign-menu'));
    expect(zIndexFor('.context-menu')).toBeGreaterThanOrEqual(6000);
  });
});
