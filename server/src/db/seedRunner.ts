import { db } from './database';

console.log('[Seed] Seeding database to baseline fixtures...');
db.resetToBaseline();
console.log('[Seed] Successfully seeded SENTINEL database with deterministic fixtures.');
process.exit(0);
