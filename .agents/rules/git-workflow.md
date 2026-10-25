# Git Synchronization Rule

After completing every user request or piece of work:
1. Stage and commit any modified/new files with a descriptive message.
2. **First PUSH**: Run `git push origin main` to publish local commits.
3. **Then PULL**: Run `git pull --no-rebase origin main` to fetch and integrate any incoming work from collaborators.
4. If a merge commit was created during pull, run `git push origin main` again to ensure the remote repository is completely synchronized.
