# ADR: Concept alignment V2 — procedural graph hero and gateway portal

Date: 2026-09-05. Status: accepted direction; implementation/visual acceptance open.

Binding coordination decision: [ADR-0008](../../../../Docs/09-decisions/ADR-0008-HOME-GRAPH-HERO-AND-PROCEDURAL-MOTION.md). Execution: [V2 packet queue](../../../../Docs/05-delivery/concept-alignment-v2/PACKETS.md).

Home puts identity, CTAs and the research graph in one integrated hero. It has no portal decoration and no second graph below the hero. Gateway owns the procedural portal. Three.js + existing GSAP are the selected enhancement stack, with native HTML controls and content, static/no-JS fallback, reduced-motion behavior, explicit cleanup, and measured route-specific performance cost. React/R3F is not required.

This decision supersedes ADR-ANIMATION's blanket runtime-library prohibition for assigned V2 packets. ADR-ANIMATION remains an immutable historical record. Other page-family surfaces remain CSS/HTML-first; no general permission for particles, custom cursors, forced scroll or unrelated libraries.

`contracts/design-authority` pinned snapshots remain intact in this documentation delivery. CA-01 adopts the central `design-overlay.json` with an explicit versioned consumer contract and tests. No dependency, API, source component or runtime token changes are made by this ADR itself. Graph data uses existing generated `GraphPayloadOut`; no invented links or relations. PUBLIC-190 and PUBLIC-350 acceptance remain open.
