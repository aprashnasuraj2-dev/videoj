# Optional Obscura source and browser adapter (development only)

SUTRA keeps the pinned-public-HTTP reader as its default. JavaScript rendering is an additive operator-enabled **local** enhancement for sparse JS-shell HTML; it is not public or generally deployable. The engine source is linked as a Git submodule at third_party/obscura, pinned to commit efe1c95962b33935fe9c53851566211074efe147 (Apache-2.0; preserve upstream notices). The Rust code (obscura-browser, obscura-js, obscura-net, obscura-ssrf, obscura-dom, obscura-cdp, obscura-cli, etc.) remains upstream rather than duplicating a potentially megabyte-scale moving fork.

## Build the source once on a trusted development host
    git submodule update --init third_party/obscura
    cd third_party/obscura
    cargo build --release -p obscura-cli --bin obscura --no-default-features
    # Optionally install the resulting binary in an absolute path.

SUTRA does **not** download a binary or compile Rust in the user's browser. Install a **trusted, reviewed build** and enable on a trusted local Node host:

    SUTRA_ENABLE_OBSCURA=1 SUTRA_OBSCURA_BIN=/absolute/path/to/obscura node apps/sutra-v2/research-workspace.mjs

The capability/preview discloses the opt-in scope allowJsRendering. Existing requests, model-only investigations, PDF, raw text/JSON/CSV and deterministic replay follow the unchanged path. A static HTML body is retrieved and robots-admitted first with SUTRA's pinned TLS transport. Only a short, likely-JS-shell HTML page can trigger one extra Obscura navigation per origin, up to three origins in a session, while a second document reservation is charged. Obscura uses no stealth, no local/private-network opt-in, no proxy, no credentials, no persistent browser profile and no arbitrary operator-supplied JS expression. Output and subprocess lifetime are capped. Rendered text passes through the existing bounded, non-executing HTML scanner. A failure returns the static version with an explicit reason. Cancellation fails closed.

**Important production gaps:** the second navigation is performed by the native browser engine, not the SUTRA pinned TLS socket. Obscura subresources and redirects can contact additional public hosts; its internal subresource bandwidth is *not* measured by SUTRA's response-byte ledger. Rechecking the final page URL after navigation limits admitted evidence, but does not undo any intermediate network contact. Robots and site terms remain applicable. Obscura executes untrusted V8 code in-process: its built-in SSRF protection and watchdog are not an OS security sandbox. Production enablement requires a network-isolated container/VM, hostname/redirect/subresource egress enforcement, overall bandwidth meter, an approved evidence-provenance review, browser-based live smoke tests and a separately approved release. Do not set SUTRA_ENABLE_OBSCURA on a public/hosted process.

The CLI is started fresh per render: cold starts may erase some of Obscura's per-page gains. Comparison of memory/startup/page-load claims must be tested on identical pages, warmed/cold, with CPU/RSS, final DOM quality, blocked cases and network bytes. Do not describe upstream benchmark figures as measured SUTRA improvements.
