import type { GameState } from '../game/types';

export async function validateRuntimeContent(state: GameState): Promise<void> {
  const [{ createContentRegistry }, { logContentValidation, validateContent }] = await Promise.all([
    import('./ContentRegistry'),
    import('./ContentValidation')
  ]);
  const validation = validateContent(createContentRegistry(state), state.clock);
  state.dev.contentValidation = validation;
  logContentValidation(validation);
}
