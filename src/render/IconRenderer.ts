import type { IconDescriptor } from '../game/types';
import type { IconVisualCategory } from '../ui/IconVisualSystem';

const iconMarkupCache = new Map<string, string>();
let iconRenderRequestCount = 0;

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

export function renderIcon(icon?: IconDescriptor, label = '', category?: IconVisualCategory): string {
  iconRenderRequestCount += 1;
  const primary = esc(icon?.primary ?? '#b98b52');
  const secondary = esc(icon?.secondary ?? '#e8d7ae');
  const shape = icon?.shape ?? 'block';
  const cacheKey = `${shape}|${primary}|${secondary}|${esc(label)}|${category ?? ''}`;
  const cached = iconMarkupCache.get(cacheKey);
  if (cached) return cached;
  const title = label ? `<title>${esc(label)}</title>` : '';

  const paths: Record<string, string> = {
    blade: `<rect x="28" y="7" width="8" height="38" rx="2" fill="${primary}" transform="rotate(42 32 32)"/><rect x="25" y="40" width="14" height="6" fill="${secondary}" transform="rotate(42 32 32)"/><rect x="29" y="44" width="6" height="12" fill="#7b4a28" transform="rotate(42 32 32)"/>`,
    bow: `<path d="M42 8c-16 11-16 37 0 48" fill="none" stroke="${primary}" stroke-width="6" stroke-linecap="round"/><path d="M42 8c6 15 6 33 0 48" fill="none" stroke="${secondary}" stroke-width="2"/><path d="M22 32h30" stroke="#e8d7ae" stroke-width="2"/>`,
    flame: `<path d="M33 58c11-6 16-17 10-28-2 6-7 8-9 12 2-13-6-23-6-23-1 10-13 18-13 29 0 8 7 13 18 10z" fill="${primary}"/><path d="M32 54c5-4 7-9 4-15-4 5-8 8-9 15z" fill="${secondary}"/>`,
    potion: `<rect x="25" y="12" width="14" height="10" rx="2" fill="${secondary}"/><path d="M22 24h20l5 24c1 6-4 10-15 10s-16-4-15-10l5-24z" fill="${primary}"/><path d="M22 38h22" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`,
    scroll: `<rect x="15" y="18" width="34" height="30" rx="4" fill="${primary}"/><path d="M17 20c7 4 23 4 30 0M17 46c7-4 23-4 30 0" stroke="${secondary}" stroke-width="3"/>`,
    pickaxe: `<path d="M12 19c15-12 31-11 43-2-15-1-27 4-38 13z" fill="${primary}"/><rect x="30" y="20" width="7" height="38" rx="2" fill="${secondary}" transform="rotate(38 33 39)"/>`,
    axe: `<rect x="31" y="16" width="7" height="40" rx="2" fill="${secondary}" transform="rotate(30 34 36)"/><path d="M26 11c12 0 20 6 20 18-9-5-17-6-25-2z" fill="${primary}"/>`,
    block: `<path d="M13 22l19-10 19 10-19 10z" fill="${secondary}"/><path d="M13 22l19 10v22L13 44z" fill="${primary}"/><path d="M51 22L32 32v22l19-10z" fill="#5d5b57"/>`,
    torch: `<rect x="29" y="26" width="7" height="31" rx="2" fill="${secondary}"/><path d="M33 8c8 8 9 17-1 24-8-6-9-14 1-24z" fill="${primary}"/>`,
    bag: `<rect x="15" y="22" width="34" height="31" rx="5" fill="${primary}"/><path d="M24 24c0-10 16-10 16 0" fill="none" stroke="${secondary}" stroke-width="4"/><path d="M19 32h26" stroke="#3a2011" stroke-width="2"/>`,
    food: `<path d="M17 38c4-17 25-25 36-14-1 15-17 29-36 14z" fill="${primary}"/><path d="M42 16c5-4 9-4 12 0-5 1-8 3-10 7z" fill="${secondary}"/>`,
    ore: `<path d="M12 43l10-21 24-8 9 20-13 18H22z" fill="#55514b"/><rect x="21" y="28" width="8" height="8" fill="${primary}"/><rect x="39" y="23" width="7" height="7" fill="${secondary}"/>`,
    armor: `<path d="M18 14l14 6 14-6 7 10-5 7v25H16V31l-5-7z" fill="${primary}"/><path d="M24 25h16v27H24z" fill="${secondary}" opacity=".35"/>`,
    ring: `<circle cx="32" cy="34" r="15" fill="none" stroke="${primary}" stroke-width="8"/><circle cx="32" cy="34" r="8" fill="none" stroke="${secondary}" stroke-width="3"/>`,
    shield: `<path d="M32 10l19 8v14c0 13-8 22-19 26-11-4-19-13-19-26V18z" fill="${primary}"/><path d="M32 15v37" stroke="${secondary}" stroke-width="5" opacity=".45"/>`,
    bone: `<path d="M15 24c-6-3-4-12 3-11 2-7 12-5 11 3l20 20c8-1 10 9 3 11 1 8-8 10-11 3L21 30c-7 1-10-4-6-6z" fill="${primary}"/>`,
    wood: `<rect x="12" y="20" width="40" height="25" rx="7" fill="${primary}"/><path d="M18 26h27M16 34h32M22 42h19" stroke="${secondary}" stroke-opacity=".55" stroke-width="3"/>`
  };

  const categoryClass = category ? ` icon-category-${category}` : '';
  const categoryData = category ? ` data-icon-category="${esc(category)}"` : '';
  const markup = `<svg class="item-icon${categoryClass}"${categoryData} viewBox="0 0 64 64" aria-hidden="true">${title}${paths[shape] ?? paths.block}</svg>`;
  iconMarkupCache.set(cacheKey, markup);
  return markup;
}

export function iconCacheStats(): { iconRenderRequestCount: number; cachedIconCount: number } {
  return { iconRenderRequestCount, cachedIconCount: iconMarkupCache.size };
}

export function resetIconCacheStatsForTests(): void {
  iconMarkupCache.clear();
  iconRenderRequestCount = 0;
}
