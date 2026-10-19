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

## Project rules
- Data access goes through react-query options/mutations in `src/lib/study-data.ts` using the browser client; RLS scopes every row to `auth.uid()`. Why: one place for cache keys and invalidation.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate, renders `AppShell`); public pages (`/`, `/auth`, `/reset-password`) stay top-level. Why: session lives in localStorage.
- Progress math lives in pure functions in `src/lib/progress.ts` with tests beside it. Why: keeps rules testable.
- Subject colors are stored as keys and mapped to literal token classes in `src/lib/subject-colors.ts`. Why: Tailwind needs literal class names.
