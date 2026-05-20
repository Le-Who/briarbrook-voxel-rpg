import { Component, type ErrorInfo, type ReactNode } from 'react';
import { App } from './App';
import type { GameUIBridge } from './bridge/GameUIBridge';
import { GameUIBridgeProvider } from './bridge/GameUIBridgeContext';
import { OverlayLayer } from './components/OverlayLayer';
import { ReactLayoutGuard } from './components/layoutGuard';

interface ReactUIRootProps {
  bridge: GameUIBridge;
}

interface ReactUIErrorBoundaryState {
  error: Error | null;
}

class ReactUIErrorBoundary extends Component<{ children: ReactNode }, ReactUIErrorBoundaryState> {
  state: ReactUIErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ReactUIErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('React UI shell failed', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="react-ui-error-panel" role="alert">
          <strong>UI shell error</strong>
          <span>{this.state.error.message}</span>
          <button type="button" onClick={() => this.setState({ error: null })}>
            Retry UI
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ReactUIRoot({ bridge }: ReactUIRootProps): ReactNode {
  return (
    <ReactUIErrorBoundary>
      <GameUIBridgeProvider bridge={bridge}>
        <App />
        <OverlayLayer />
        <ReactLayoutGuard />
      </GameUIBridgeProvider>
    </ReactUIErrorBoundary>
  );
}
