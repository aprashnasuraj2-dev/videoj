# SUTRA human screen-reader acceptance gate

This validator prepares the manual evidence record required by the accessibility phases. It deliberately rejects “automated audit passed” as a substitute for a human operating a stated screen reader.

Supported record labels cover VoiceOver (iOS/macOS), TalkBack Android, NVDA (Firefox/Chromium) and JAWS Chromium. A real record binds the exact SUTRA source revision and browser/AT versions and preserves pass/fail/not-applicable/untested states.

Core acceptance requires human-observed landmarks/headings, control names, first-load journey navigation, transcript search, cue-seek feedback, comparison state announcement, consent dialog context + focus return, review preview/save feedback and error/denied states. Written-source integrity and language-switch observations remain visible even when non-core for a specific acceptance run.

The tool cannot prove that the human used the stated assistive technology or that coaching was absent. Keep names, emails, account details and private screen recordings out of the public record.

CLI: `node tools/sutra-screenreader-check/cli.mjs RECORD.json > validated.json`.

The template is invalid until a real human observation is entered.
