---
"@everything-dev/events-plugin": minor
"api": minor
"ui": minor
---

Integrate Luma calendar subscriptions to display external events alongside internal NEAR Builders events (#77).

- **events plugin**: New `LumaService` with calendar key configuration (comma-separated `LUMA_CALENDAR_API_KEYS`), calendar metadata fetching, paginated event aggregation with cursor-based navigation across multiple calendars, in-memory caching with TTL and concurrent request deduplication, and admin visibility for private events.
- **api**: New `listLumaCalendars`, `listLumaEvents`, and `getLumaEvent` endpoints. Luma endpoints receive user context for admin role detection.
- **ui**: Luma events display alongside internal events on `/events` with calendar source filtering dropdown, URL-based deduplication across sources, Luma event detail pages at `/events/luma/$calendarId/$eventId`, and a re-usable `EventDetail` component shared between internal and Luma event views.
