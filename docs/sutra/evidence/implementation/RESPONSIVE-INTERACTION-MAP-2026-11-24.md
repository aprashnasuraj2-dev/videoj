# SUTRA responsive screen design and interaction map — 2026-11-24

Reviewed against exact code `2686e3cacdd3e4d552820ccaf57b968a7544ddb4` and https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45297219581/job/138120560126.

This is a **retrospective contract for the existing implementation**, not evidence that responsive behavior was specified before the first styles were written. That chronology matters: P041-07 remains intentionally omitted; this artifact supports P041-09 and future styling changes.

## Layout contract

| Surface | Desktop / wide behavior | Narrow behavior (<=760 CSS px) | Zoom / overflow rule |
| --- | --- | --- | --- |
| Header | Brand plus stage/language tools share the row and may wrap | Header wraps; tools take the available row and the selector remains bounded | No control may force document-width overflow |
| Hero | Large two-line task heading and bounded introduction | Same semantic order; typography scales through `clamp()` | Text reflows; no horizontal scroll dependency |
| Main workspace | Lesson and evidence use a 1.15fr / 1fr two-column grid | Single column | Children use `min-width:0` and long values wrap |
| Transcript cue | Timestamp and wording share a row | Timestamp and wording stack | Source wording wraps; timestamp remains stable |
| Peer input | URL field and action share flexible row | Input and action stack full-width | Long URL is clipped inside its own field, not document width |
| Comparison cards | Two equal bounded columns | Single column | Provenance/values use overflow wrapping |
| Execution summary | Label/value two-column definition list | One column | Long origin/router values wrap |
| Dialogs | Width capped to available viewport | Max 94vw / 90vh with internal scrolling | Focus remains inside modal; document does not become the scroll container |
| Review controls | Flexible wrapped action row | Natural wrapping | >=24 CSS px sampled core targets |
| Native media | 16:9 width-bounded player | Full available content width | Video remains within containing panel |

## Screen-state map

The shared learner status contract keeps UI state separate from prose:

- `empty`: no run/media operation has started;
- `loading`: bounded work is in progress and `aria-busy=true`;
- `consent`: an explicit external-contact decision is required;
- `denied`: the requested external operation was refused before a completed result;
- `input_error`: local validation rejected the request before execution;
- `error`: the operation stopped without a completed result;
- `cancelled`: explicit cancellation stopped the operation;
- `completed`: the specific bounded operation completed.

Partial/unknown **execution outcomes** are deliberately displayed separately from screen state. A partial peer run uses an error screen state plus a visible partial outcome because some approved reads happened but no result completed. An unknown write outcome is not relabeled completed or retried automatically.

## Core interaction path

1. Read the task and synthetic/factual boundary before any external operation.
2. Inspect the local cue and catalog receipt.
3. Compare available video-side evidence with a missing or explicitly hypothetical written-side source.
4. Optionally load synthetic timing media and use native player controls.
5. Seek only on explicit action and report actual native media time.
6. Preview a bounded review card before local persistence.
7. Optionally run the peer workbench; consent is required before each external contact class.
8. Keep execution details in the collapsed inspector unless the viewer asks for them.

The source/excerpt remains authoritative data throughout this path; the responsive layer never generates factual agreement.

## Automated responsive evidence

The exact-head Chromium profile passed:

- 360 x 800 viewport with no document-level horizontal clipping;
- 200% Chromium CSS zoom with no horizontal clipping;
- keyboard access and modal focus restoration;
- sampled >=24 CSS px core target sizes, including the language selector;
- reduced-motion preference;
- active native captions;
- transcript and media usability at the narrow boundary.

These are automated Chromium observations. They do not substitute for P041-08 fresh-viewer usability, P049-07 physical touch testing, or a human screen-reader pass.

## Change rule

Future CSS/layout work should preserve this artifact as the regression contract. A change that intentionally alters the breakpoints or interaction order must update this artifact and the matching browser checks in the same code revision.
