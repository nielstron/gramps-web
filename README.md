# Gramps Web — customised fork

Fork of [Gramps Web](https://github.com/gramps-project/gramps-web). See the original project for documentation, installation instructions and contributions.

[Try the DuckTales demo](https://misc.niels.bond/stammbaum-demo/) — automatic read-only access to a fictional example tree, with invented dates and journeys.

## Additions and fixes

Changes maintained in this fork (some require the [companion API fork](https://github.com/nielstron/gramps-web-api)):

- **Blog editing:** Markdown editor, cover images, author links, links to tree objects, private drafts, publishing and unpublishing. Post dates and ordering use first publication rather than last modification.
- **Historical movement maps:** routes include personal and family events, combine shared journeys, and use a common recency colour scale and legend. Routes can be hidden.
- **Map time ranges:** two-ended year slider, grey track outside the selected range, and filtering of both markers and routes. The last 200 years are selected by default.
- **Map and timeline exploration:** ancestor/descendant filters, movement previews for name searches, timeline event-type filtering, and URL-based navigation state.
- **Relationship graphs:** two-person connection view, distinct relationship types and uncertain edges, additional layout controls, and arcs for childless couples.
- **Tree navigation:** corrected centring, URL-based graph/person selection, browser back navigation, and consistent profile-opening actions.
- **Create or link:** unified object pickers with full nested creation dialogs, returning the new object to the original form. Fixes prevent nested saves and selections from affecting the wrong form.
- **Family editing:** consistent relative-creation flows from graphs and profiles; reconciliation of equivalent relationships and automatic child ordering by birth date, with API support.
- **Life events:** chronological ordering, including family events and death/burial sequencing, with manual drag-and-drop overrides. Names also support drag ordering.
- **Person details:** profile-image upload, preferred-name indicators, localised birth names and dates, and titles derived from degree and coronation events.
- **Editing and search:** hide empty read-only sections, close editing with Escape, keep desktop search expanded, and prioritise people in search results.
- **Subpath hosting:** consistent application-prefix handling for internal links, revisions, registration and authentication redirects; preserve deep links through login.
- **User preferences:** server-synchronised appearance settings and per-user home-person handling.
- **Administration:** SMTP settings and test email, sender display name, expiring API-key management, invitation/password-reset actions, configurable navigation and invitation text, and AI-assistant settings.
- **History:** searchable edit-history view.
