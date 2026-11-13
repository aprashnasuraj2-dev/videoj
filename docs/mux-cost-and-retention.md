# Mux delivery and retention review (public tariff, 2026-11-13)

Official public pricing: https://www.mux.com/pricing and https://www.mux.com/docs/pricing/overview. **The account's actual plan, other assets, cumulative usage and billing status were not available through the connected tools**. Therefore the figures below describe a possible Free-plan budget, not a verified account entitlement or invoice.

The original DHAGO film is 64 seconds = 1.0667 delivery minutes per complete play.

| Full film plays | Approx. delivered minutes | Share of 100,000-minute allowance |
| ---: | ---: | ---: |
| 1,000 | 1,067 | 1.07% |
| 10,000 | 10,667 | 10.67% |
| 50,000 | 53,333 | 53.33% |
| 93,750 | 100,000 | 100% |
| 100,000 | 106,667 | 106.67% |

Mux's published Free plan includes 100,000 monthly delivery minutes and a limit of 10 stored videos. The paid tier includes allowances/credits but has different billing rules. At standard up-to-720p Basic/Plus listed rates, overage delivery begins around $0.0008/minute **only on a plan that permits usage-based billing**. Do not assume that the Free plan will deliver over its allowance or that all minutes are available to DHAGO. Example: 100,000 complete plays would use about 6,667 minutes above 100k; at a hypothetical $0.0008/min marginal rate this is about $5.33 excluding any other usage or credits.

A partial watch contributes its actual delivered minutes; 100k delivery minutes does **not** equal 100k unique visitors. Replays, buffering, other videos and monthly aggregation all matter. HLS media is fetched directly from Mux, not proxied through Patro application Workers; normal R2 static requests are separate from Mux delivery and have their own quotas. Both domain records remain dedicated to the DHAGO static bucket.

Keep the public Mux playback asset available through judging. Do not rerun the failed Mux-upload workflow without inspecting the existing asset, and do not upload duplicate film objects. Before any paid plan change or new Mux upload, check usage limits in the owner's dashboard and obtain approval. Public video availability alone is not proof of an account's paid/free plan.
