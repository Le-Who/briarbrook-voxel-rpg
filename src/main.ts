import { Game } from './game/Game';
import './styles.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');

if (!canvas || !uiRoot) {
  throw new Error('Missing game canvas or UI root');
}

const game = new Game(canvas, uiRoot);
game.start();

declare global {
  interface Window {
    briarbrookGame?: Game;
  }
}

window.briarbrookGame = game;
