---
"ui": minor
---

Fix stale vote counts and add social preview metadata to detail pages.

- **ui**: Fix a query-key mismatch on the projects list page (`projectIds` vs `projectIdList`) that left upvote/downvote counts stale until a full page reload. The vote mutations and the live-vote subscription now write to the same cache key the on-screen counts read from. Also fixes the project detail page's `userVoteState` cache to store the shape its query actually reads instead of a bare string.
- **ui**: Add `siteUrl` to Open Graph/social preview metadata on builder profile, event, and project detail pages via a shared `getSiteUrl` helper, so shared links on these pages render proper previews and canonical URLs.
