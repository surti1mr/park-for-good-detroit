<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All data access goes through server functions in src/lib/api.functions.ts (no browser→database calls); some user networks block the database host directly. Clients poll getState every 2s instead of realtime for the same reason.
- AI nonprofit matching lives in src/lib/match.server.ts; returned ids are filtered against the nonprofits table (filterMatches) and topped up by tag overlap so results are always real organizations.
- Identity is demo-only: the selected profile id is stored in localStorage; sign-up creates a profiles row (no auth accounts).
- Missing demo identity shows the welcome screen after hydration; explicit entry selects Driver 1, preventing silent sign-in.
- Demo reset is an atomic database RPC using marked seed bookings, preserving profiles and priorities while restoring today's Detroit schedule.
