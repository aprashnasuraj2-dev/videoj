# Scent Atlas — A Perfume Store for People Who Can't Smell the Screen

**An independent experiential-commerce concept for fragrance, beauty and creative brands.**

**Role:** Concept, creative direction, UX writing, art direction, interface design, front-end engineering, accessibility-first implementation, testing and release.  
**Status:** Live self-initiated prototype, not a commercial retailer.  
**Experience:** https://scent-atlas.aafnaipatro.com/  
**Public release source:** `0730f5e3146269dc9c099ea554e314a6e3c8d4da`

## The problem isn't a lack of fragrance notes. It's a lack of imagination.

Perfume shopping online asks a strange thing of people: make an intimate, sensory decision using a screen that cannot carry scent. A shopper may understand "bergamot," "mineral accord" or "woody dry-down" and still not know what the experience would feel like. More adjectives don't necessarily solve that gap. 

**Scent Atlas explores a different starting point: ask where someone would rather be.** Wet pavement after rain. A sunlit cedar workshop. The moment an orange peel breaks open. Each carries a material memory worth translating into a sample.

## A place first. A sample decision second.

The homepage presents three editorial worlds, each grounded in a tangible texture and two unpretentious scent cues:

**01 / Rain on Pavement.** Cool stone and crushed leaves. An after-rain story opens with *Rain on Stone*, passes through *Green Air* and settles on the clean, dry edge of *Pencil Cedar*. The **After Rain** concept kit makes that progression tangible.

**02 / Cedar Workshop.** Dry wood and pencil shavings. The **Wood Bench** kit leads with warm *Cedar Shavings*, quiets with *Pencil Cedar*, then introduces *Peel & Wood* as its brighter contrast.

**03 / Fresh Orange Peel.** Citrus oil and bitter pith. The **Freshly Peeled** kit begins with *Fresh Peel*, moves toward the bittersweet *Peel & Wood*, then lifts into the greener *Green Air*.

Six original fictional fragrance profiles form a single shared catalog, so the three stories stay coherent without pretending that each is a completely unrelated product. Each sample has a reason to be in its set: one lead, two helping contrasts. Descriptions say what opens, what follows and what lingers; they do not invent measured wear times or disclose nonexistent ingredients.

The normal path takes three clear choices: **choose a scene → explore its kit → complete the local demo**. Comparison is optional. Direct links and history work without a login, quiz or client-side router. The experience finishes with an explicit truth: *Demo complete. No order was placed.*

## An editorial identity built from material, not decoration.

The three scenes share a close-up camera language but not the same emotional temperature. Pavement is cool slate and muted green; cedar is amber, tobacco and parchment; orange is an intense rind against near-black. Each photographic study was created specifically for the concept, cropped as its own visual world and saved locally as compressed WebP. The three-vial still life is an original HTML/CSS illustration rather than a fabricated product photograph. Text remains real, selectable interface copy rather than lettering baked into a generated image.

A generous serif voice carries the imaginative moments. Small, restrained sans-serif labels provide orientation. On mobile, scenes become immersive vertical choices. The comparison changes into readable scene-by-scene cards, not a crushed desktop table. The underlying six-fragrance inventory remains visible in a proper data table.

## A deliberately modest technology stack.

This is a complete static website with one typed and validated catalog, deterministic page generation and eleven shareable routes. Content validation rejects duplicate IDs, unknown vial references, repeated samples and wrong scene-to-kit mappings before release. The website needs no customer information, commerce service, cookies, database, third-party font or analytics script. Optional JavaScript enhances link copying; it is not required to read a story or finish the demonstration.

A dedicated release artifact was deployed to its own Cloudflare Worker and custom hostname, after a hosting-integration limitation made the intended Cloudflare Pages route unavailable through the connected account. Its bundled resources require no external origin fetches and leave other Aafnai Patro services untouched. 

## Evidence, not invented conversion claims.

At release, six catalog tests and strict TypeScript checks passed. Twelve generated HTML documents (eleven routes plus the 404 page) passed local link and markup checks. Chromium visual renders covered seven representative page types at 320, 390, 768 and 1440 CSS pixels with no remaining horizontal overflow. An external public check retrieved **all eleven application routes** with correct page identities and canonical URLs; a separate fetch verified the custom 404 status and a 200 response for the social-cover asset. The initial first-party landing assets total approximately **153 KiB of raw source bytes**—a file-budget calculation, not a network performance benchmark.

No real buyer study, measured conversion uplift, fulfillment workflow, production perfume, three-run LCP benchmark or full screen-reader certification is claimed. This is an intentional prototype, ready to be evaluated honestly rather than presented as fabricated launch results.

## What a brand could take forward.

Scent Atlas is not a replacement for a complete fragrance store. It is a reusable discovery direction: lead with a meaningful sensory memory, let customers compare in familiar language, and invite physical sampling when actual product operations exist. Real commercial rollout would still require brand and trademark review, manufactured sample specifications, ingredient/allergen disclosures, commerce operations and research with real shoppers.

**Explore the experience:** https://scent-atlas.aafnaipatro.com/  
**Source and implementation evidence:** https://github.com/aprashnasuraj2-dev/videoj/tree/scent-atlas/projects/scent-atlas  
**Concept disclosure:** All six scent names, kits, 2 mL sizes and packaging in this work are illustrative. No purchase or personal-data collection occurs.
