# Web Solutionist CMS — Agent Brief

## What We're Building
A personal content thinking and pipeline dashboard for 
managing LinkedIn content. This is a React web app styled 
with Tailwind CSS.

## Core Purpose
This tool solves one problem: Precious knows what to write 
but struggles to articulate it. The CMS helps him think 
through a post before writing it, then organizes everything 
in a visual pipeline.

## Tech Stack
- React (component-based UI)
- Tailwind CSS (styling)
- Gemini API (AI thinking layer)
- LocalStorage (data persistence)

## App Structure

### Pipeline View (Main Screen)
Kanban board with these columns:
1. Raw Idea
2. Thinking
3. Writing
4. Ready
5. Published

Each column contains cards. Cards are draggable between 
columns.

### Creating a New Card
When user clicks "New Post":
1. User drops a raw idea (free text, messy is fine)
2. Gemini reads the idea and pre-fills answers to 
   3 thinking questions:
   - Who is this really for?
   - What should they feel after reading?
   - What's the one thing they should walk away knowing?
3. User reviews, edits, or rewrites the AI suggestions
4. Based on final answers, AI recommends a content format 
   and explains why:
   - Storytelling
   - Thought Leadership
   - Strategic Reframe
   - Listicle
5. User writes the post inside the card with that clarity

### Card Contents
Each card stores:
- Raw idea
- Thinking questions + answers (edited by user)
- Recommended format + reason
- Content pillar tag
- Full post draft
- Date created

### Content Pillars (Tag Options)
- Website Reality
- Strategic Reframe
- Web Solution Thinking
- Personal Reflection
- Soft Positioning

## AI Integration (Gemini)
- Model: Gemini 2.0 Flash
- Used only when creating/thinking through a new card
- Pre-fills thinking questions based on raw idea
- Recommends format based on final thinking answers
- Keep prompts focused and specific — no generic responses

## Design Principles
- Clean, dark or neutral dashboard aesthetic
- Mobile-aware but desktop-first
- No clutter — every element earns its place
- Cards should feel light and easy to interact with
- Pipeline should be scannable at a glance

## What the Agent Should NOT Do
- Do not overcomplicate the data structure
- Do not add features not listed here
- Do not use any backend or database — LocalStorage only
- Do not use any UI library other than Tailwind
- If something is unclear, ask before building

## File Structure
src/
  components/
    Board.jsx        # Main Kanban board
    Column.jsx       # Individual pipeline column
    Card.jsx         # Post card component
    NewPostModal.jsx # Card creation flow with AI thinking
    PillarTag.jsx    # Pillar label component
  utils/
    gemini.js        # Gemini API calls
    storage.js       # LocalStorage read/write helpers
  App.jsx
  main.jsx
.env                 # VITE_GEMINI_API_KEY stored here
