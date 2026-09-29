# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Mandatory continuity for every AI contributor

Before working, read `docs/HANDOFF.md`, `docs/PRODUCT_SPECIFICATION.md`, `docs/DESIGN_SYSTEM.md`, `docs/DATABASE_AND_SYNC_DESIGN.md`, and `docs/BACKEND_SETUP.md`. Inspect the current source and git diff; preserve existing uncommitted work and the user's custom assets. Follow the latest explicit user decisions and distinguish planned behavior from deployed behavior.

Use Expo Router + React Native Paper, shared theme tokens/components, exact money calculations and server-enforced business permissions. Do not introduce per-screen design systems, hardcoded material prices or client-side authorization as the authority. Routes stay thin; domain, data services and UI remain separated.

Before ending EVERY work session, update `docs/HANDOFF.md`: current state, exact changes, migrations/deployments, test evidence, untested limits, blockers, pending approvals, running jobs, and the next concrete task. Append a dated author/session note and reconcile stale current-state text. Update canonical product/design/backend documents when approved decisions or implementation status change. Never include credentials or claim unverified completion.

A handoff does not grant permissions that were withheld from another AI. Read and preserve pending approval boundaries. Coordinate ownership before simultaneous agents edit this shared workspace. Do not reset, discard, commit or push unrelated changes as part of a handoff.

# Mandatory BOMedia UI skill

Before designing, implementing, changing or reviewing any screen, navigation, responsive layout or shared UI, read and follow `docs/skills/bomedia-ui/SKILL.md`. This is required for project UI work even when the skill is not automatically listed by the agent's skill discovery. Follow it together with `docs/DESIGN_SYSTEM.md`; later explicit owner decisions take precedence.

Draft UI in a Claude design canvas (artifact) before or alongside implementing it, and cross-check the live pages against it for UI/UX principles; this is the owner's standing instruction as of 9 September 2026. It supplements, and never overrides, `docs/skills/bomedia-ui/SKILL.md` and the approved tokens, role colours and business rules.

Desktop web must use a desktop operations workspace with appropriate navigation, density and data presentation. Mobile must retain touch-friendly layouts. Share domain logic and data services while adapting presentation. Verify the applicable desktop and mobile behaviour before claiming a UI change complete, and record untested limits honestly.
