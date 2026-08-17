# LINK Decision Engine — Full Design Spec

## Overview
Transform the Web Solutionist CMS from a passive tracker into an active decision engine powered by LINK — a persistent AI LinkedIn Growth Partner. Five dashboard questions, one intelligence layer.

---

## Schema Changes (Supabase, additive only)

### `posts` table — 3 new columns
| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `dms` | integer | 0 | Exact DM count per post |
| `comment_quality` | text | null | `surface` / `basic` / `engaged` / `deep` |
| `icp_audience` | text | null | `founders` / `students` / `smbs` / `service_providers` / `innovators_builders` / `random` |

### `health_scores` table (new)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| week_number | int | Week of year |
| week_start | date | Monday |
| week_end | date | Sunday |
| consistency_score | int | 0-100 based on 3x/week target |
| engagement_score | int | 0-100 (DMs + comment quality + profile visits combined) |
| variety_score | int | 0-100 (unique formats used / 6 total) |
| pillar_balance_score | int | 0-100 (unique pillars used / 5 total) |
| overall_score | int | 0-100 composite |
| link_notes | text | LINK's summary for the week |
| created_at | timestamp | |

### `post_recommendations` table (new)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| week_number | int | Week these were generated for |
| recommendations | jsonb | Array of 3 objects: `{topic, format, pillar, reasoning, confidence}` |
| applied | boolean | Whether acted upon |
| created_at | timestamp | |

### `link_sessions` table (new)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| session_type | text | `daily_review`, `weekly_review`, `chat`, `challenge` |
| link_notes | jsonb | LINK's observations, patterns, advice |
| user_commitments | jsonb | What user agreed to do |
| week_number | int | Context week |
| created_at | timestamp | |

### `link_chat` table (new)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| role | text | `link` or `user` |
| message | text | Chat message content |
| week_number | int | Context week |
| created_at | timestamp | |

---

## Component Changes

### DashboardView.jsx — Full Rebuild
Three zones, top to bottom:

**Zone 1: What's Working**
- Best format by profile visits per post (not impressions)
- Best pillar by profile visits per post
- Avg DMs/post
- Avg comment quality (mapped 1-4 from surface/basic/engaged/deep)
- ICP breakdown (pie/distribution of audience types from recent posts)
- All driven by actual `posts` data grouped by format and pillar

**Zone 2: Content Health Score**
- Single large card showing 0-100 with color: red <50, amber 50-75, green 75+
- Four breakdown bars: consistency, engagement, variety, pillar balance
- LINK's one-sentence weekly note below

**Zone 3: Your Next 3 Posts**
- Three recommendation cards
- Each: topic, format, pillar, data-backed reasoning
- "Write This" button opens Writing Room with format/pillar pre-loaded
- Manual "Refresh Recommendations" button

Add "Quick Log" button in header for spontaneous posts.

### WritingRoomView.jsx — Simplified Publish
- Remove impressions/comments/profile views from publish modal
- Publish = just date + optional DMs
- Format/pillar optional (no penalty for unplanned posts)
- "Write This" entry point: accepts pre-loaded format + pillar from recommendations

### PublishedTrackerView.jsx — Expanded Tracking
- Existing columns stay
- 3 new columns: DMs (numeric), Comment Quality (dropdown), ICP Audience (dropdown)
- Edit modal: 6 fields instead of 3
- "Quick Log" button in header: minimal form (title text, date, optional format/pillar)

### WarRoomView.jsx — New Component (4th tab)
- Top: LINK's daily review summary (streak, posts this week, today's priority)
- Middle: Full chat interface — ask LINK anything, get strategic responses
- Bottom: Active challenges/observations from LINK for the week
- Persistent memory via `link_chat` and `link_sessions` tables

### Sidebar.jsx — New Tab
- Add "War Room" menu item with chat icon

### App.jsx — New View
- Add `war-room` case to view switcher

---

## AI / Gemini Changes

### `gemini.js` — New Functions

**`generateDailyReview(posts, weekPosts)`**
Returns: streak, posts this week, strongest/weakest post, today's priority, biggest opportunity.

**`generateHealthScoreNote(healthScore, posts, weakAreas)`**
Returns: LINK's honest weekly assessment. Highlights weaknesses, not just wins.

**`generatePostRecommendations(posts, topFormat, topPillar)`**
Returns: 3 post suggestions with topic, format, pillar, reasoning, confidence level.
Special handling: if all posts underperformed, AI explicitly says so and recommends experimentation, not doubling down.

**`chatWithLink(messages, context)`**
Returns: LINK persona response with full strategic context (post history, health score, commitments).

---

## Health Score Formula

`overall = (consistency * 0.35) + (engagement * 0.35) + (variety * 0.15) + (pillar_balance * 0.15)`

**Consistency:** min(posts_this_week / 3 * 100, 100)
**Engagement:** avg of normalized DMs + comment quality score + profile visits per post
**Variety:** unique_formats / 6 * 100
**Pillar Balance:** unique_pillars / 5 * 100

---

## LINK Persona

Identity: Senior LinkedIn Growth Partner. Direct, honest, analytical, evidence-driven.
Never flatters. Never generic. Questions weak ideas. Points out blind spots.
Optimizes for long-term authority, not short-term vanity.

PERSONALITY: Direct, Honest, Analytical, Strategic, Calm, Curious, Evidence-driven

ROLES: Content Strategist, Accountability Coach, LinkedIn Mentor, Performance Analyst, Strategic Advisor, Challenger

---

## Migration Safety

All changes are additive:
- Existing `posts` data preserved (new columns nullable/default)
- Existing views unchanged
- New tables created alongside old
- No destructive operations
