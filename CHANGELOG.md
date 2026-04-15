# Changelog

All notable changes to Chronicles are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- **Undo on delete** — after confirming deletion of an event, character, or faction a 5-second undo toast appears. The item is removed from the UI immediately; the database write is deferred and cancelled if Undo is clicked.
- **Cascade delete / reference cleanup** — deleting a character or faction that is still referenced now offers to automatically remove all references (event `characterIds` / `factionIds`, character `factionIds`) and then delete the entity, instead of blocking the operation.
- **Save As** — `Save As…` button in the application header copies the current JSON database to a user-chosen path and reloads from that path.
- **Create New DB** — `Create New DB` button on the welcome screen opens a save dialog and initialises a blank database at the chosen location.
- **CSV export** — Export tab now has per-table CSV export (events, characters, factions, collections, locales) using a native save dialog.
- **Timeline tab** — new tab in HomeView showing all events in chronological order (oldest first) with a searchable filter.
- **Translation coverage** — Stats tab now includes a per-language coverage table with progress bars showing how many locales have a non-empty translation for each WoW client language.
- **Husky + lint-staged** pre-commit hook runs ESLint and Prettier on staged `src/**/*.{ts,tsx,scss}` files.
- **JSON Schema** (`docs/db-schema.json`) — JSON Schema draft-07 documenting all six database entity types.
- **React component tests** — `@testing-library/react` + `happy-dom` tests for `ErrorBoundary` and `LocaleUtils` (29 tests total across 4 test files).
- **Recent files** — loader shows up to five recently opened database paths with Open and Remove actions (persisted in `localStorage`).
- **Stats dashboard** — dedicated Stats tab with counts for events, characters, factions, collections, locales, and unreferenced locales.
- **Orphan locale cleanup** — LocaleList "Delete all unreferenced" button batch-deletes locales that are not referenced by any entity.
- **CI** — GitHub Actions workflow (`ci.yml`) runs type-check, ESLint, and Vitest on every push/PR to `main`.
- **Release workflow** — GitHub Actions workflow (`release.yml`) builds and publishes a Tauri installer when a `v*` tag is pushed.
- **README** — Full rewrite with CI badge, feature list, installation guide, architecture diagram, database format documentation, and Lua/XML export reference.

### Changed
- Character and faction deletion now offers cascade reference cleanup instead of showing a blocking warning.
- File naming homogenised to PascalCase for all React component files (`AppContent.tsx`, `EventList.tsx`, `CharacterList.tsx`, `FactionList.tsx`, `LocaleList.tsx`).
- SCSS sizing uses relative units (`rem`/`%`) instead of fixed pixels.
- Window is resizable with configurable minimum size (1200 × 700).

### Fixed
- Lua/XML generation now fully escapes backslashes, newlines, and control characters in all string fields.
- Load errors and export errors are surfaced to the user via Ant Design notifications instead of being silently logged.
- Referential integrity is checked before deletion; cascade cleanup removes stale foreign-key references.
- Automatic `.bak` backup created after each successful database load.
- CSP and Tauri capability allowlists restricted to the minimum required permissions.

---

## [0.1.0] - 2026-04-14

### Added
- Initial release with event, character, faction, collection, and locale management.
- JSON database persistence via `neutron-db`.
- Lua/XML addon export for the WoW Chronicles addon.
- Collection filter, search, and pagination in all list views.
- Tauri v2 desktop shell (Windows).
