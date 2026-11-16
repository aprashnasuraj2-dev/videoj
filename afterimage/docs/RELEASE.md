# AFTERIMAGE release isolation

## Targets

- Proposed primary: https://afterimage.aafnaipatro.com/
- Fallback: an isolated static deployment URL from a dedicated AFTERIMAGE host/project.
- Media: versioned assets; primary film may be Mux for the bonus, with an independently reachable MP4 fallback using the same skin.

## Isolation rules

- AFTERIMAGE build root is afterimage/.
- Do not change DHAGO root runtime, DETOUR runtime, their existing domain mappings, or shared worker behavior to make AFTERIMAGE work.
- Prefer static HTML/JS/CSS/images/media; ordinary clock/seam updates must not invoke a Worker.
- No Mux management credential in Git or browser assets. Public playback IDs are allowed.
- Verify HTTPS, MIME, byte ranges, CORS and cache policy before custom-domain cutover.

## Rollback

Each release records source SHA plus immutable deployment/artifact identity. Keep the prior known-good deployment reachable until anonymous smoke checks pass. If custom-domain mapping fails, remove/revert only the AFTERIMAGE mapping and serve the fallback deployment; DHAGO/DETOUR mappings remain untouched.
