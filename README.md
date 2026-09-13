# Gramps Web — customised fork

Fork of [Gramps Web](https://github.com/gramps-project/gramps-web). See the original project for documentation, installation instructions and contributions.

[Try the DuckTales demo](https://misc.niels.bond/stammbaum-demo/) — automatic read-only access to a fictional example tree, with invented dates and journeys.

## Additions and fixes

Changes maintained in this fork (some require the [companion API fork](https://github.com/nielstron/gramps-web-api)):

### Added features

- **Blogging:** Write and publish Markdown posts with formatting tools, inline media, and links to people, events, and other objects from the database.
- **Historical movement:** Explore a person's movements over time on the map, including their ancestors or descendants, with colour-coded dates.
- **Time and family filters:** Narrow maps and timelines to a chosen period, family branch, or event type.
- **Connection graphs:** Explore how two people are connected through family relationships, including connections beyond shared ancestry.
- **Titles:** Derive a person's titles from graduation and coronation events.
- **Edit history:** Search past changes to find when and how records were edited.
- **Administration:** Manage email delivery, invitations, API keys, navigation, and AI-assistant settings from the interface.

### Changed behaviour

- **Unified addition:** Adding a new object and linking an existing object always use the same buttons, including when creating related objects along the way.
- **Family editing:** Add relatives directly from graphs or profiles, reusing existing relationships rather than creating duplicates.
- **Chronological ordering:** Children are ordered by birth and life events by date, with drag-and-drop overrides for events and names.
- **Graph navigation:** Recentring, profile previews, shareable links, and browser back navigation make exploring family connections more predictable.
- **Names and dates:** Profiles and graphs show birth names and preferred names more clearly and format dates for the reader's locale.
- **Personalisation:** Keep your home person and appearance preferences across browsers and devices.
- **Blog publication:** Posts retain their original publication date and position when edited, with drafts kept separate from published posts.
- **Everyday conveniences:** Upload profile pictures directly from a person's profile, search from an always-visible desktop search bar with people prioritised, hide empty profile sections, and close editing with Escape.
