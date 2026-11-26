# Release-candidate artifact gate — implementation readiness

The development manifest remains intentionally router-free while inference is disabled. A separate deterministic release-artifact gate now requires complete live-provider usage, a clean judge-path observation, budget approval/reserve and the reviewed spec pins before it can construct a publisher-funded manifest.

It then binds the approved model into every published network, emits content-hashed release graph paths, rewrites the exact peer link, and records source/spec/live-cost evidence hashes.

No release config satisfying these requirements exists yet. This is release readiness infrastructure, not P089/P090 public release evidence.