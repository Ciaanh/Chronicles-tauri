# Chronicles

![CI](https://github.com/Ciaanh/Chronicles-tauri/actions/workflows/ci.yml/badge.svg?branch=main)

A desktop companion tool for the World of Warcraft **Chronicles** addon. It lets you manage a local JSON database of Warcraft universe events, characters, factions and collections, then export them as Lua/XML files ready to drop into the addon.

---

## Features

- Browse, search, and paginate **events**, **characters**, **factions**, **locales**, and **collections**
- Full **multi-language locale** editor (11 WoW client languages)
- **Delete protection** — referential integrity check before removing characters, factions, or locales
- **Orphan locale cleanup** — identify and bulk-delete unreferenced locale entries
- **Database statistics** tab — live counts per table including unreferenced locales
- **Recent files** — last 5 opened databases shown on the loader screen
- Automatic `.bak` backup of the JSON file before every open
- Lua/XML export with proper string escaping

---

## Installation

### Prerequisites

| Tool | Version |
|------|---------|
| [Rust](https://rustup.rs/) | stable toolchain |
| [Node.js](https://nodejs.org/) | ≥ 20 |
| [Tauri CLI v2](https://tauri.app/start/) | bundled via npm |

### Steps

```bash
git clone https://github.com/Ciaanh/Chronicles-tauri.git
cd Chronicles-tauri
npm install
npm run tauri dev        # development build
npm run tauri build      # production installer
```

---

## Architecture

```
src/
├── app/
│   └── addon/
│       ├── generator.ts          # Lua/XML export orchestration
│       └── services/
│           ├── luaUtils.ts       # Lua string escaping utilities
│           ├── dbService.ts      # DB → Lua table serialisation
│           └── localeService.ts  # Locale → Lua serialisation
├── components/
│   ├── _event/       EventList.tsx + EventModal.tsx
│   ├── _character/   CharacterList.tsx + CharacterModal.tsx
│   ├── _faction/     FactionList.tsx + FactionModal.tsx
│   ├── _locale/      LocaleList.tsx
│   ├── _collection/  CollectionList.tsx + CollectionSelect.tsx
│   ├── _shared/      ChaptersEditor, LocaleEditor, TagSelect
│   ├── stats/        StatsTab.tsx
│   ├── home/         HomeView.tsx  (left-side tab shell)
│   ├── settings/     SettingsView.tsx
│   └── ErrorBoundary.tsx
├── database/
│   ├── dbcontext.ts     ContextValue interface + createContext
│   ├── dbprovider.tsx   React provider — load, backup, validate, mappers
│   ├── loader.tsx       File-picker UI shown before a DB is loaded
│   ├── mappers/
│   │   └── index.ts     createMappers() factory (6 mappers, cache-backed)
│   ├── jsondb/
│   │   └── types.ts     DbObject / Schema / Tables (local copies)
│   └── models/
│       ├── appObjects/  Event, Character, Faction, Collection, Locale, Chapter
│       └── dbObjects/   DB_* row interfaces
├── _utils/
│   ├── localeUtils.ts   LocaleUtils — create/update locale records
│   └── useRecentFiles.ts  localStorage-backed recent-files hook
src-tauri/
└── src/
    ├── main.rs
    └── lib.rs
docs/
└── db-schema.json       JSON Schema (draft-07) for the database file
```

### Data flow

```
JSON file  ──(neutron-db)──▶  AsyncDatabase
                                    │
                          ensureMapperCache()   ← preloads all 4 lookup tables once
                                    │
                          createMappers()       ← 6 strongly-typed mapper objects
                                    │
                           DbProvider (React context)
                                    │
                    ┌───────────────┼───────────────┐
                 EventList   CharacterList   FactionList  …
```

---

## Database format

The database is a single-line compressed JSON file (managed by [neutron-db](https://www.npmjs.com/package/neutron-db)) with a `.json` extension. The full machine-readable schema is at [`docs/db-schema.json`](docs/db-schema.json).

### Top-level structure

```json
{
  "events":      [ …Event rows… ],
  "characters":  [ …Character rows… ],
  "factions":    [ …Faction rows… ],
  "collections": [ …Collection rows… ],
  "locales":     [ …Locale rows… ]
}
```

### Key types

**Locale** — a localised string shared by reference across all other objects:
```json
{ "id": 1, "enUS": "Sargeras", "ishtml": false, "translations": { "frFR": "Sargeras" } }
```

**Event**:
```json
{
  "id": 1, "name": "Sargeras corrupted",
  "yearStart": -25000, "yearEnd": -25000,
  "eventType": 1, "timeline": 1,
  "collectionId": 1, "labelId": 42,
  "factionIds": [3, 7], "characterIds": [12],
  "chapters": [{ "headerId": 43, "pageIds": [44, 45] }],
  "link": "", "order": 0
}
```

See [`docs/db-schema.json`](docs/db-schema.json) for the complete schema with descriptions.

---

## Lua/XML export format

The add-on generator produces two files:

| File | Contents |
|------|----------|
| `Chronicles_Data.lua` | All events, characters, factions, collections and locale strings as Lua tables |
| `Chronicles_Locales.xml` | `<Script>` elements referencing the Lua locale files |

All string values are passed through `escapeLuaString()` which escapes `\`, `"`, tab, and ASCII control characters before insertion.

---

## Development

```bash
npm run lint          # ESLint (zero warnings policy)
npm run format        # Prettier
npm test              # Vitest unit + component tests
npm run test:ui       # Vitest with browser UI
```

### Testing

- **Unit tests** in `src/**/*.test.ts` — run in Node environment
- **Component tests** in `src/**/*.test.tsx` — run in happy-dom environment (annotated `// @vitest-environment happy-dom`)

Pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files automatically.

---

## Permissions (Tauri)

The app requests read/write access to:

| Scope | Reason |
|-------|--------|
| `$HOME/**` | Database files typically stored in home directory |
| `$DOCUMENT/**` | Alternative database location |
| `$DOWNLOAD/**` | Export destination |
| `$DESKTOP/**` | Export destination |

No network access is requested.

---

## Licence

See [LICENCE](LICENCE).
