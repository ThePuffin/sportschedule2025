# Project Instructions for AI Agents

## Project Overview

This is a **sports schedule application** with a React Native/Expo frontend and a NestJS backend. It displays games for multiple sports leagues (NFL, NBA, NHL, MLB, MLS, NCAA, etc.) with features like team filtering, live scores, bookmarks, and user accounts.

## Repository Structure

```
├── frontend/          # React Native / Expo app (main frontend)
├── backend/           # NestJS API server
├── dist/              # Build output
└── updateLeagues.js   # League update script
```

## 📚 MANDATORY: Read the Documentation First

**Before modifying any file in `frontend/`, you MUST read its corresponding documentation file in `frontend/docs/`.**

Each file in `frontend/docs/` (and `frontend/docs/components/`) contains AI-readable documentation explaining:

- **Purpose** — what the file does
- **Key Features** — main functionality
- **State Variables** — all state with types and descriptions
- **Key Functions** — function signatures and behavior
- **Key Memoized Values** — useMemo computations
- **Data Flow** — how data moves through the component

### Documentation Index

| Source File                               | Documentation                                     |
| ----------------------------------------- | ------------------------------------------------- |
| `frontend/app/(tabs)/schedule.tsx`        | `frontend/docs/schedule.tsx.md`                   |
| `frontend/app/(tabs)/index.tsx`           | `frontend/docs/index.tsx.md`                      |
| `frontend/app/(tabs)/calendar.tsx`        | `frontend/docs/calendar.tsx.md`                   |
| `frontend/app/(tabs)/connection.tsx`      | `frontend/docs/connection.tsx.md`                 |
| `frontend/app/(tabs)/_layout.tsx`         | `frontend/docs/_layout.tsx.md`                    |
| `frontend/context/AuthContext.tsx`        | `frontend/docs/AuthContext.tsx.md`                |
| `frontend/hooks/useFavoriteColor.ts`      | `frontend/docs/useFavoriteColor.ts.md`            |
| `frontend/utils/fetchData.ts`             | `frontend/docs/fetchData.ts.md`                   |
| `frontend/utils/types.tsx`                | `frontend/docs/types.tsx.md`                      |
| `frontend/utils/date.ts`                  | `frontend/docs/date.ts.md`                        |
| `frontend/utils/utils.tsx`                | `frontend/docs/utils.tsx.md`                      |
| `frontend/components/Accordion.tsx`       | `frontend/docs/components/Accordion.tsx.md`       |
| `frontend/components/CardLarge.tsx`       | `frontend/docs/components/CardLarge.tsx.md`       |
| `frontend/components/TeamFilter.tsx`      | `frontend/docs/components/TeamFilter.tsx.md`      |
| `frontend/components/FilterSlider.tsx`    | `frontend/docs/components/FilterSlider.tsx.md`    |
| `frontend/components/FilterAccordion.tsx` | `frontend/docs/components/FilterAccordion.tsx.md` |

## Mandatory Rules for AI Agents

1. **ALWAYS read the `.md` documentation file** for a source file before editing it. This is not optional.
2. **When creating a new file**, create a corresponding documentation file in `frontend/docs/` (or `frontend/docs/components/` for components). For backend files, create or update the matching file in `backend/docs/`.
3. **When making significant changes**, update the corresponding documentation file and add an entry to the relevant changelog: `frontend/CHANGELOG_ARCHITECTURE.md` for frontend changes and `backend/CHANGELOG_ARCHITECTURE.md` for backend changes.
4. **For every new feature or user-visible behavior change**, update the relevant docs and changelog as part of the implementation. Documentation is not a separate cleanup task.
5. **The `backend/` directory** has its own structure; consult `backend/README.md` for backend-specific instructions.
6. **If you are unsure about a file's behavior**, read its documentation file FIRST before reading the source code.
7. **When a feature is removed or modified**, the documentation must be brought into line in the same change:
   - **Delete** any documentation section that describes a feature, state variable, function, prop, or behavior that no longer exists in the code.
   - **Rewrite** the sections that describe behavior which has been modified, so they match the new implementation (do not leave stale descriptions "just in case").
   - If a source file has been **deleted**, delete its documentation file too and remove its row from the Documentation Index below.
   - Documentation must never describe functionality that is absent from the code: outdated docs are treated as bugs, not as harmless leftovers.
8. **English only**: all code comments, commit messages, documentation files (`.md`), and changelog entries MUST be written in English — no French or other languages. The only exception is user-facing translated strings (e.g. the 11-language support in `frontend/utils/utils.tsx`).

## Architecture Notes

- **Firestore sync**: `frontend/app/(tabs)/_layout.tsx` handles bidirectional sync between local cache and Firestore. Child screens must wait for `firestoreReady` from `useAuth()` before initializing from cache.
- **Caching**: `frontend/utils/fetchData.ts` provides compressed caching (`saveCache`/`getCache`) with timestamps and retry logic.
- **State management**: Uses React Context (`AuthContext`, `HorizontalScrollContext`) and localStorage/sessionStorage for persistence.
- **Translations**: `frontend/utils/utils.tsx` provides `translateWord()` and `translateFilterLabel()` for multilingual support (11 languages).
- **Colors**: `frontend/hooks/useFavoriteColor.ts` computes accent colors from favorite teams with a module-level cache to prevent flickering.

## Changelog

See `frontend/CHANGELOG_ARCHITECTURE.md` for a history of architectural changes and fixes.
