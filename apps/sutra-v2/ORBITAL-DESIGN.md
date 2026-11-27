# SUTRA orbital frontend reference adaptation

Reference archive inspected: outputs/src/components/agents/AgentAvatar.tsx (six avatar families, spring and trails), AgentOrchestrator.tsx (role/state metadata, workflows, simulated transport), pages/AgentWorkspace.tsx (swarm/comms/config), RingMap.tsx (rotation and zoom), styles/tokens.css (Paper & Phosphor), EraToggle.tsx, AppShell.tsx, Guestbook.tsx and public manifest/service worker. The archive's HTML is a Vite mount point, not a standalone rendered site.

## Product boundary
- Twelve stations represent actual SUTRA capabilities rather than fictitious web communities.
- Six avatars are presentation roles. Explicit deterministic rehearsal is separate from actual local scripted council telemetry. A response event is not proposal admission; admitted proposals are logged separately.
- No secret or model credential is persisted by the orbital layer. Connection drafts stage into the two existing council slots; temperature/fallback/priority are not live routing settings. Use the existing local operator plan for actual approved execution.
- No hidden model reasoning is fabricated. Activity is public operation summaries or clearly labeled synthetic rehearsal steps.
- The signed guestbook is explicitly enabled and stored locally; a non-extractable P-256 key signs only user notes. It is not canonical verification or model identity. The activity journal is unsigned.
- PWA registration is opt-in; only the offline fallback and immutable hashed assets are cached. Navigations are network-first, and offline cannot certify or change a conclusion. No secret/source data is cached by the service worker.
- The previous guided debugger remains at ?surface=debugger. Its original first-viewport test is preserved on that route. The orbital landing has a separate first-viewport regression.
- No new dependencies or remote fonts. Fonts are system fallbacks, SVG uses DOM primitives rather than React/Motion/Canvas. The 1997 skin is local and reduced motion is respected.
