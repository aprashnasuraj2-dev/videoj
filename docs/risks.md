# Risk register

| Risk | Mechanism | Detection / fallback | Owner |
| --- | --- | --- | --- |
| v8 code in v10 entry | Familiar but incompatible APIs | Installed docs/exports, runtime element registration; official 10.4 starter | AI |
| Fake or dead control | Separate UI state drifts from media | Observe media after every action; use Video.js controls | AI |
| Phone layout failure | Narrow embed differs from viewport | Container queries and 320px tests; two rows | AI + owner physical check |
| Invisible controls | Bright video overwhelms overlay | Solid control shelf and measured pairs | AI |
| Focus disappears | Auto-hide or popup steals keyboard route | Focus/escape tests, keep focused controls visible | AI |
| Expiring asset / bonus mismatch | Demo ID is not owner's persistent asset | Owner creates persistent public Mux asset; verify network source | Owner + AI |
| Protected deployment | Host login required for judges | Signed-out final URL smoke test; static hosting fallback | AI |
| Missed deadline | Last-minute bonus or auth work | Early submission target; remove A-B replay first | Owner + AI |
| Quota expense | Video proxied through app worker | Serve media CDN directly, confirm free limits | AI |
| Rights ambiguity | Third-party clip not covered by skin license | Original code-generated film; track all bundled notices | AI + owner |

Known environment issue: terminal Git HTTPS push has no credentials. Connected GitHub API writes work. Commit snapshots are synchronized through the API with a branch-head lease; terminal clone/fetch remains read-only.
