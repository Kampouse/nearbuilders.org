---
"@everything-dev/events-plugin": minor
"api": minor
"ui": minor
---

Add events plugin with full CRUD, participant management, and Luma import (#24).

- **events plugin**: Full events plugin providing create, read, update, delete, and participant join/leave flows backed by a PostgreSQL schema. Supports event visibility levels and status tracking.
- **api**: Expose events endpoints — list, create, get, update, delete, join/leave participants, list participants, and fetch event metadata from external Luma URLs.
- **ui**: Public events pages at `/events` with listing, detail, creation, and editing views. Admin dashboard now supports events proposals alongside builders and projects.
- **infra**: New `postgres-events` container, `EVENTS_DATABASE_URL` env var, and port renumbering for the existing plugin databases.
