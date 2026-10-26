# Instructions for coding agents

1. Read [handover.md](handover.md) (how the project works, conventions, gotchas) and
   [state.md](state.md) (current version, status, next steps) before making changes.
2. Local development uses the **production** database. Don't trigger write actions while
   testing unless the owner asked you to.
3. Commit and push only when the owner says so: a push to `main` deploys to production.
4. Every pushed change bumps the version and gets a changelog entry in `state.md`
   (rules at the top of that file).
5. Never put secrets (keys, webhook URL, cron secret) in the repository. They live in `.env.local`.
