---
"ui": minor
---

Move projects to public layout with sort, badge, and metadata (#25).

- **ui**: Project pages (`/projects`) are now publicly viewable instead of locked behind the authenticated dashboard. Project creation and editing routes add `beforeLoad` auth redirects.
- **ui**: New `NewBadge` component highlights projects created in the last 7 days on both the list and detail views.
- **ui**: Project list gains a sort dropdown (most votes, newest, oldest) with URL search param persistence.
- **ui**: Project detail pages emit Open Graph meta tags (title, description, social image) for link previews.
