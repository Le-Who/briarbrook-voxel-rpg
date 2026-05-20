import { Game } from './game/Game';
import { mountReactUI, type MountedReactUI } from './ui/react/mountReactUI';
import './styles.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');

if (!canvas || !uiRoot) {
  throw new Error('Missing game canvas or UI root');
}

const game = new Game(canvas, uiRoot);
const reactUI = mountReactUI(uiRoot, game.getReactUIBridge());
game.start();

declare global {
  interface Window {
    briarbrookGame?: Game;
    briarbrookReactUI?: MountedReactUI;
  }
}

window.briarbrookGame = game;
window.briarbrookReactUI = reactUI;
