# Epiminds x Lovable Hackathon — Brief + Our Ideas (Working Doc)

Event link: `https://luma.com/gkbghqvs?utm_source=ep-FNPYEg9caH`

## Brief (as given)

### Scope

Bring your best ideas, and build them in a way that shows off **agentic communication**.

You will be building multi-agent systems with two core requirements:

- **Communication setup** between agents during problem-solving
- **Collaboration setup** where agents build on each other’s work

This is a chance to bring that multi-agent solution, you've parked in the back of your mind, to the forefront of London’s tech ecosystem.

### Random notes / references

- Product site: `https://www.carescopeintel.com/`
- Exa: `https://exa.ai` (great web search for agents)
- v0 slides template: `https://v0.app/templates/minimalist-slides-deck-IbxcZTbVYuv`
- DSPy scoring algorithms (idea: critique / optimize prompts or outputs)
- “tell → show → tell” (narrative structure for demo)

---

## Our idea dump (captured)

### Sales / pitch / slides

- **Sales pitch generator**
  - One agent generates, another agent picks holes in it
  - From discovery call notes → sales pitch slides (Gamma-like)
  - Persona-based generation
- **Generate slides**
  - 7 slides
  - Reusable components (quadrant graph, images, expandable sections, titles, paragraphs, standout text)
  - Notes for each slide
  - Optional drag-and-drop editing + branding input

### Live sales / support chat

- **Real-time assistant during a live sales chat**
  - Analyzes chat, suggests upsells, key points to hit, improvements
- **Recovery & rescue**
  - 3 agents in a chat:
    - One trying to get to solution
    - One analyzing
    - One “manager” takeover: “Hi it’s Sarah, I saw we weren’t getting this right…”
- **Upsell agent**
  - Analyzes chat looking for upsell opportunities

### Chrome extension concepts

- **Property truth-teller**
  - Reads a property listing → flags risks / gotchas → suggests what to ask landlord/agent
- **Product truth-teller**
  - Honest analysis of products + pricing, “what you’re really getting for your money”

### Misc / loose

- Grass reminders
- Holiday bookings with timing / nudges

### Use-case verticals (for chat-bot / sales assistant)

- Boilers
- Roofing
- Dental
- Buying a house
- Buying a car
- Gardening / lawn care
- Kitchen installation
- Corporate event sponsorships
- Office fit-outs / relocation
- High-end safaris / expedition travel
- Cosmetic surgery / hair transplants
- Executive coaching

---

## What we already have (code assets we can reuse)

From the leadgen repo we cloned:

- **/aichat** command center + flow builder (React Flow style) + “tools” concepts
- **/socials** research/repurpose/op-mode flows
- **Exa research route** (`/api/research`) + saved research sessions
- **OpenRouter-backed generation routes** (generate, refine, optimize, review)

This gives us:

- A ready-made **agent orchestration UI (flow builder)** for multi-agent communication
- A proven **research pipeline (Exa)** + stored sources
- A working **generation loop** (draft → critique → refine)

---

## Converging on a hackathon build (recommended)

We should pick **one “hero” demo** that *obviously* satisfies:

1) agents talk to each other (visible message passing / tool calls), and  
2) agents build on each other’s work (draft → critique → revise → format → deliverable).

### Option A (recommended): “Agentic Pitch-to-Slides”

**Input:** discovery call notes (or a URL + short context)  
**Output:** a 7-slide pitch deck + speaker notes + objections/FAQ + a “critic report”

#### Agent roles (collaborative pipeline)

- **Agent 1 — Problem/USP Synthesizer**
  - Extract core problem, ICP, positioning, differentiation, “so what”
- **Agent 2 — Research Agent (Exa)**
  - Pull recent facts, proof points, competitor references, market context
- **Agent 3 — Pitch Drafter**
  - Writes the narrative, value props, proof points, CTA
- **Agent 4 — Critic / DSPy-style Scorer**
  - Scores for clarity, specificity, credibility, persona fit; flags weak claims; suggests edits
- **Agent 5 — Slide Composer**
  - Converts the final pitch into a 7-slide structure + speaker notes + reusable slide blocks

#### “Agentic communication” (how we show it)

- Display a **shared workspace** (artifacts): `problem`, `research`, `draft`, `critic-notes`, `final-slides`
- Show **agent-to-agent messages** (e.g. Critic → Drafter: “Slide 3 claim lacks proof; use Source #2 highlight”)
- Show **tool calls**:
  - Research agent calls Exa → returns sources/highlights
  - Critic calls scoring rubric function(s)

#### Deliverable format

- Render slides in-app (use the v0 slides template style as a UI reference)
- Export:
  - Markdown slides (simple)
  - Or JSON slide schema + optional PDF later

---

### Option B: “Live Sales Chat Copilot (Multi-agent)”

**Input:** live chat transcript (or simulated chat)  
**Output:** real-time suggestions, upsells, rescue takeover, coaching

#### Agent roles (competitive + collaborative)

- **Closer Agent**: drive to conversion
- **Margin Agent**: maximize upsell / bundle / price integrity
- **Coach/Critic Agent**: rewrites messages, points out tone issues, missed objections
- **Manager Takeover Agent**: intervenes when risk detected (“escalate” moment)

#### “Agentic communication” (how we show it)

- Agents debate: “offer discount vs hold price”
- Manager agent can override or “approve” a message before sending

---

## How we’ll present (tell → show → tell)

- **Tell (30s):** “We built a system where agents collaborate, critique, and produce a real deliverable.”
- **Show (2–3 min):** Run one end-to-end example (notes → research → draft → critique → slides).
- **Tell (30s):** Summarize why multi-agent collaboration made output better + faster.

---

## MVP checklist (fast path)

### Must-have (to satisfy brief)

- [ ] Visible multi-agent chat log (agent-to-agent comms)
- [ ] Shared artifact store + revision history (agents build on each other)
- [ ] At least one real external tool call (Exa research) OR a convincingly simulated one if key missing

### Nice-to-have

- [ ] “Critic score” dashboard (DSPy-ish scoring)
- [ ] Slide renderer + export
- [ ] Personas and vertical presets

---

## Open questions (to decide in 10 minutes)

- Which hero demo do we ship: **Option A** (Pitch-to-Slides) or **Option B** (Live Copilot)?
- Which vertical do we anchor the example in (so outputs feel real)?
- Do we show the flow builder as the “agent network”, or keep it behind the scenes and show only agent logs?


