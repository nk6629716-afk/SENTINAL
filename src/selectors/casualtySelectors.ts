import { CasualtyRecord } from '@shared/types';

/**
 * Returns all active casualties from state.
 */
export function selectCasualties(casualties: CasualtyRecord[] = []): CasualtyRecord[] {
  const triageRank = (cat?: string) => {
    if (!cat) return 99;
    if (cat.startsWith('immediate')) return 0;
    if (cat.startsWith('delayed')) return 1;
    if (cat.startsWith('minimal')) return 2;
    if (cat.startsWith('expectant')) return 3;
    return 4;
  };
  return [...casualties].sort((a, b) => triageRank(a.triageCategory) - triageRank(b.triageCategory));
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
