# AFTERIMAGE design lock

## First-use flow

1. Player and film dominate the opening viewport.
2. Viewer sees Play and **Try a comparison** immediately at phone width.
3. The authored action validates the stored earlier frame, seeks once to the paired current moment, then opens the same comparison UI used by manual pins.
4. Manual flow is Play → **Pin moment** → move seam or use Pinned / Split / Now → **Close comparison**. The remembered pin remains on the rail and **Compare** reopens it.
5. **Clear pin** removes the remembered frame. Pin replacement is atomic: a failed replacement keeps the prior valid pin.

## Signature geometry

- Reference image overlays the same fitted video content rectangle and is clipped from the right.
- Current video remains the only moving playback surface.
- Seam and rail pin share an engraved copper tick; current playhead remains visually distinct.
- The rail interval band spans referenceTime ↔ currentTime in either direction without intercepting seeking.
- Labels are Pinned, Now, and a signed delta. Negative, zero, hours, unknown duration and approximate timing must be handled explicitly.

## Opening authored pair

- Film: **THE WATERLINE**.
- Camera A, fixed wide.
- Reference target: dry state around 00:06.
- Current target: first water crossing / reflective floor around 00:14.
- Landmarks: limestone gauge, circular inspection opening, copper gate.
- Visible proof: architecture does not move; water/reflection state does.
- Final cue times must be replaced by observed timestamps from the encoded release, not storyboard values.

## Visual system

Ink-black deck, limestone-white type, copper reference mark and outlined cool current mark. UI type uses tabular numerals. Serif is reserved for title/wordmark. Controls live on an opaque/dark-backed surface rather than depending on footage contrast. Motion is short and nonessential; reduced-motion removes it.
