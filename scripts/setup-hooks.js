import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const hooksDir = path.join(rootDir, '.git', 'hooks');

const postMergeHook = `#!/bin/sh
# Auto-update report.md and REPORT.md after every git pull (merge)
echo "[git-hook] post-merge: Updating project report..."
node scripts/generate-report.js || true
`;

const prePushHook = `#!/bin/sh
# Auto-update report.md and REPORT.md before every git push
echo "[git-hook] pre-push: Regenerating project report..."
node scripts/generate-report.js || true

if ! git diff --quiet REPORT.md report.md 2>/dev/null; then
  echo "[git-hook] pre-push: Committing updated REPORT.md..."
  git add REPORT.md report.md
  git commit -m "docs: auto-update REPORT.md before push" --no-verify || true
fi

exit 0
`;

export function setupHooks() {
  if (!fs.existsSync(hooksDir)) {
    console.log('[setup-hooks] .git/hooks directory not found, skipping hook setup.');
    return;
  }

  try {
    fs.writeFileSync(path.join(hooksDir, 'post-merge'), postMergeHook, { encoding: 'utf-8', mode: 0o755 });
    fs.writeFileSync(path.join(hooksDir, 'pre-push'), prePushHook, { encoding: 'utf-8', mode: 0o755 });
    // Remove post-commit hook so working tree remains pristine after committing
    const postCommitPath = path.join(hooksDir, 'post-commit');
    if (fs.existsSync(postCommitPath)) {
      fs.unlinkSync(postCommitPath);
    }
    console.log('[setup-hooks] Git hooks (post-merge, pre-push) successfully configured!');
  } catch (err) {
    console.warn('[setup-hooks] Could not write git hooks:', err.message);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupHooks();
}
