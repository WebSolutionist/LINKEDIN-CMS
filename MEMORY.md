# Web Solutionist CMS — Project Memory

## Project Owner
- **Name**: Precious
- **Brand**: Web Solutionist
- **Platform**: LinkedIn content creator
- **Growth Partner**: LINK (AI-powered LinkedIn strategist)

## Key Decisions
- **Framework**: React + Tailwind CSS (Vite template)
- **AI Model**: Gemini 2.0 Flash via `@google/genai`
- **AI Persona**: LINK — direct, honest, evidence-driven LinkedIn Growth Partner
- **Database Layer**: Supabase for real-time cloud data persistence
- **Tailwind Version**: Tailwind CSS v4 using `@tailwindcss/vite` plugin
- **Visual Aesthetic**: Highly premium, custom dark-navy (`#0A1931`) and bright electric teal (`#00B4D8`) "Founder's War Room" style.

## Project Status
- [x] Project initialized (React + Tailwind)
- [x] Gemini API client installed (`@google/genai`)
- [x] `@supabase/supabase-js` installed & initialized
- [x] Premium sidebar navigation (`Sidebar.jsx`) implemented — 4 tabs
- [x] **Dashboard View** — rebuilt as decision engine (What's Working, Health Score, Next 3 Posts)
- [x] **Writing Room** — simplified publish flow (no stats at publish, just date + optional DMs)
- [x] **Published Tracker** — 6-field edit modal (impressions, comments, profile views, DMs, comment quality, ICP)
- [x] **Quick Log** — log spontaneous posts with optional format/pillar
- [x] **War Room** — LINK chat interface with daily review, persistent memory, observations panel
- [x] **LINK Persona** — 6 roles: Content Strategist, Accountability Coach, Mentor, Analyst, Advisor, Challenger
- [x] **Health Score** — weekly composite 0-100 (consistency 35%, engagement 35%, variety 15%, pillar balance 15%)
- [x] **Post Recommendations** — AI generates 3 data-backed post suggestions
- [x] Cleaned up obsolete local storage modules and placeholder templates
- [x] Verified full build compilation

## Architecture Notes
- The app operates across 4 strategic views (Dashboard, Writing Room, Published Tracker, War Room)
- **Database Tables (Supabase)**:
  - `posts`: raw seeds, active drafts, published stats, DMs, comment quality, ICP audience
  - `weekly_reviews`: AI content audits and advisory logs
  - `health_scores`: weekly composite 0-100 scores with LINK notes
  - `post_recommendations`: AI-generated 3-post recommendations per week
  - `link_sessions`: LINK's observations, daily reviews, challenges, commitments
  - `link_chat`: conversation history with LINK

## LINK Persona
- Identity: Senior LinkedIn Growth Partner
- Personality: Direct, honest, analytical, strategic, evidence-driven
- Never flatters. Never generic. Questions weak ideas.
- 6 roles: Content Strategist, Accountability Coach, Mentor, Performance Analyst, Strategic Advisor, Challenger

## Dashboard Answers (The 5 Questions)
1. **What's Working** — Best format/pillar by profile visits, avg DMs, avg comment quality, ICP breakdown
2. **What to Write Next** — AI recommendations based on actual format/pillar engagement data
3. **Are you talking to the right people?** — ICP signal tracker per post (Founders, Students, SMBs, Service Providers, Innovators/Builders, Random)
4. **Content Health Score** — Weekly 0-100 composite with 4 dimensions
5. **Your Next 3 Posts** — Data-backed AI recommendations with Write This buttons

## Migration Required
- Run `supabase-migration.sql` in Supabase SQL editor to add new columns and tables

## API Configuration
- Sourced from `.env`:
  - `VITE_GEMINI_API_KEY`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Session Log
- **2026-05-28**: Rebuilt CMS from scratch to implement Supabase database integration. Built brand design, dashboard, dual-stage post editor, revamp comparator.
- **2026-07-08**: Transformed CMS into LINK Decision Engine. Added LINK persona, 4th War Room tab, content health score, performance-driven post recommendations, ICP tracking, comment quality scoring, Quick Log for spontaneous posts, simplified publish flow.
