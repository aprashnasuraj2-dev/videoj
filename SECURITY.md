# Security policy

These are source-first UI libraries. Please report security issues privately to the repository owner using GitHub's available private vulnerability reporting channel if enabled; otherwise contact the maintainer privately rather than publishing exploit details or credentials in an issue.

- Never commit Mux API credentials, service tokens, cloud deployment keys, signed URLs, or private environment files.
- Public playback IDs are intentionally visible and are not interchangeable with Mux management credentials.
- Preserve explicit source ownership and input validation for host-provided media URLs and metadata. Avoid rendering untrusted cue text as raw HTML.
- Do not make management API requests from browsers. Use server-side or CI-controlled deployments with scoped credentials.
- A successful test in one browser does not prove safety or codec behavior in all browsers; verify each supported host environment.
