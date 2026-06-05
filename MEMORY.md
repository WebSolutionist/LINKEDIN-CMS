# Web Solutionist CMS — Project Memory

## Project Owner
- **Name**: Precious
- **Brand**: Web Solutionist
- **Platform**: LinkedIn content creator

## Key Decisions
- **Framework**: React 19 + Tailwind CSS v4 (Vite 8 template)
- **AI Model**: Gemini 2.0 Flash via `@google/genai` (installed, not yet integrated into UI)
- **Database Layer**: Supabase for real-time cloud data persistence (`@supabase/supabase-js`)
- **Styling**: Tailwind CSS v4 using `@tailwindcss/vite` plugin
- **Visual Aesthetic**: Premium dark-navy war room (`#061022` / `#0A1931`) with electric teal accents (`#00B4D8` / `#0077B6`), "Founder's War Room" style
- **Font**: Inter (300–900 weights)

## Project Status
- [x] Project initialized (React + Tailwind + Vite)
- [x] Supabase client configured & installed
- [x] Gemini API client installed (`@google/genai`)
- [x] Premium sidebar navigation (`Sidebar.jsx`) with 4 views
- [x] Dashboard View (`DashboardView.jsx`) with SVG-based bar/pie charts, stat cards, monthly performance table
- [x] Content Calendar (`ContentCalendarView.jsx`) with calendar/table/card views, CSV upload, drag-to-schedule, monthly insights bar
- [x] Calendar Edit Modal (`CalendarEditModal.jsx`) for scheduling posts on specific dates
- [x] Split-panel Writing Room (`WritingRoomView.jsx`) with ideas drawer, hook/format/pillar/angle/CTA fields, draft editor, auto-save, drag-to-reorder, publish flow
- [x] Published Tracker (`PublishedTrackerView.jsx`) with search, performance metrics table, calendar navigation
- [x] Edit Stats Modal (`EditStatsModal.jsx`) for inline impressions/comments/profile_views editing
- [x] Pillar Badge (`PillarBadge.jsx`) — reusable color-coded pillar tag component
- [x] All obsolete local storage modules and placeholder templates cleaned up
- [x] Full build verified (Vite build successful)

## Architecture Notes
- **4 views** managed by `App.jsx` via `currentView` state:
  1. **Dashboard** — Performance analytics with animated bar/pie charts, KPI stat cards, monthly post ranking
  2. **Content Calendar** — Mon/Wed/Fri posting grid with drag-to-schedule, CSV bulk import, 3 view modes (calendar/table/card), monthly insights
  3. **Writing Room** — Ideas pipeline drawer (Seeds → Drafting → Scheduled), full post editor with auto-save, publish flow
  4. **Published Tracker** — Searchable table of published posts with edit metrics and calendar navigation

- **Database Table** (`posts`):
  - `id` (primary key), `created_at`, `raw_idea`, `hook_idea`, `draft`, `format`, `pillar`, `angle`, `cta`, `status` (idea/drafting/scheduled/published), `published_at`, `calendar_date`, `display_order`, `impressions`, `comments`, `profile_views`

- **AI Layer** (`@google/genai`): Package installed. Currently scoped for future use in Weekly Reviews, Suggest Pillar, and Tone Revamping features.

## API Configuration
- Sourced from `.env`:
  - `VITE_SUPABASE_URL` — Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key
  - `VITE_GEMINI_API_KEY` — not currently set

## Component Tree
```
App.jsx
├── Sidebar.jsx (nav: Dashboard, Content Calendar, Writing Room, Published Tracker)
└── main content area (switched by currentView)
    ├── DashboardView.jsx
    │   └── PillarBadge.jsx
    ├── ContentCalendarView.jsx
    │   ├── CalendarEditModal.jsx
    │   ├── PostDetailModal (inline)
    │   └── PillarBadge.jsx
    ├── WritingRoomView.jsx
    │   └── PillarBadge.jsx
    └── PublishedTrackerView.jsx
        ├── EditStatsModal.jsx
        └── PillarBadge.jsx
```

## Session Log
- **2026-05-28**: Initial Supabase integration. Built dark-navy brand design tokens, premium sidebar navigation, dashboard with SVG metrics charts, dual-stage post editors with auto-save, side-by-side revamp comparisons (planned), published tracker with inline metrics editing. Verified build output.
- **2026-06-04**: Added Content Calendar view with calendar/table/card modes, CSV import, drag-and-drop scheduling, monthly insights bar, unscheduled ideas drag tray. Full rebuild with all 4 views operational. Build verified.
