import { CasualtyRecord } from '@shared/types';

/**
 * Returns all active casualties from state.
 */
export function selectCasualties(casualties: CasualtyRecord[] = []): CasualtyRecord[] {
  return casualties;
}

/**
 * Returns casualties filtered by triage category.
 */
export function selectCasualtiesByTriage(casualties: CasualtyRecord[] = []) {
  return {
    immediate: casualties.filter((c) => c.triageCategory === 'immediate'),
    delayed: casualties.filter((c) => c.triageCategory === 'delayed'),
    minimal: casualties.filter((c) => c.triageCategory === 'minimal'),
    expectant: casualties.filter((c) => c.triageCategory === 'expectant'),
  };
}

/**
 * Returns immediate priority casualties.
 */
export function selectImmediateCasualties(casualties: CasualtyRecord[] = []): CasualtyRecord[] {
  return casualties.filter((c) => c.triageCategory === 'immediate');
}
