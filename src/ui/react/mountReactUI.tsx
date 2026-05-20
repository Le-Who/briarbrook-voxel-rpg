import { createRoot, type Root } from 'react-dom/client';
import { ReactUIRoot } from './ReactUIRoot';
import type { GameUIBridge } from './bridge/GameUIBridge';

export interface MountedReactUI {
  host: HTMLDivElement;
  unmount: () => void;
}

export function mountReactUI(uiRoot: HTMLDivElement, bridge: GameUIBridge): MountedReactUI {
  const existingHost = uiRoot.querySelector<HTMLDivElement>(':scope > .react-ui-layer');
  const host = existingHost ?? document.createElement('div');
  host.className = 'react-ui-layer';
  host.dataset.reactUiMounted = 'true';
  if (!existingHost) uiRoot.appendChild(host);

  const root: Root = createRoot(host);
  root.render(<ReactUIRoot bridge={bridge} />);

  return {
    host,
    unmount: () => {
      root.unmount();
      host.remove();
    }
  };
}
