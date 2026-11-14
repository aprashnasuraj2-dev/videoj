# DHAGO — From fibre to fabric, public stress lab
2026-11-14 · Supporting evidence, not the primary contest artwork.

## Creative direction
The original 64-second **Studies in Thread** film is still the primary design presentation. The stress lab uses **distinct specimens** to test playback in contrasting conditions, without reducing Nepal's textile heritage to a repeating generic string.

- **Sheep wool** is fleece from sheep. The short sheep clip is illustrative stock from outside Nepal, credited to François Nguyen.
- **Chyangra pashmina** is the fine undercoat of a Himalayan mountain **goat**, not sheep. The pashmina clip was filmed in **Kashmir**, by Florenz/Florence Bourgade — label the origin accurately.
- **Nepalese Dhaka** is a different traditional handwoven textile, and the Oxlaey clip actually records weavers in Nepal. Do not label Dhaka weaving as pashmina production.
- **Sound of the loom** is an actual mechanical loom sound captured in Germany; not field-recorded in Nepal.
- Full competition-facing copy remains in **English**; Devanagari and Arabic titles are intentional internationalization **test data**, not a change in the primary entry language.

## Evidence matrix
| Scenario | How it is demonstrated | What is not established |
| --- | --- | --- |
| 8-second film / no chapters / poster error | Real short Wikimedia Commons video; cue-free instance, deliberately broken poster | Unsupported codecs on all devices |
| Four original chapters | Actual original 64s film | Whether captions work on all assistive technologies |
| 40 chapters | Forty generated VTT cues over the **actual length** of Nepali Dhaka footage | Two-hour playback; do not call this a two-hour video |
| Out of order / overlap / gaps / overrun | Controlled malformed fixture, deterministic normalization and issue report | Native handling of every arbitrary VTT syntax error |
| Uneven durations | 2 seconds adjacent to the remaining ~60 seconds of original footage | Fifty-minute adjacent chapter: requires real long-form media |
| International and long titles | Real Kashmir pashmina footage, generated multilingual VTT | Comprehensive font support in all operating systems |
| Late chapters | Track attached 4 seconds after loadedmetadata | All possible network/cache races |
| Missing captions / multiple caption languages | Absence case plus generated two-language fixture | Human comprehension of the sample translations |
| Audio-only | Real Ogg loom recording via <audio> | Safari Ogg support; device codec acceptance remains browser-dependent |
| Source 404 | Missing path with original-film backup | Recovery from all network and DRM errors |
| 240px width | Real container size; responsive controls | 200–400% *browser* zoom (CSS scaling is not equivalent) |
| Buffering/stalled/seeking | Native media event observation and previous tests | Fault injection covering every network state |
| DVR live / casting / iOS fullscreen / sandbox iframe | Clearly identified manual verification in lab | **Not claimed implemented** without real feeds, permissions and devices |

## Media licenses and conditions
All external media are fetched from Wikimedia Commons and remain visibly credited. They do **not** become original DHAGO footage and are not silently relicensed under Apache-2.0. Verify direct hosting and codecs on real clients, and preserve licensed attributions in any redistribution.

- [Oxlaey, Making handwoven DHAKA fabric in Nepal (CC BY-SA 3.0)](https://commons.wikimedia.org/wiki/File:Making_handwoven_DHAKA_fabric_in_Nepal_%E2%80%A2_%E0%A4%A2%E0%A4%BE%E0%A4%95%E0%A4%BE.webm)
- [Florenz, Pashmina, The Gold of Kashmir & The Himalaya (CC BY 3.0)](https://commons.wikimedia.org/wiki/File:Pashmina,_The_Gold_of_Kashmir_%26_The_Himalaya.webm)
- [François Nguyen, Sheep grazing (CC BY 2.0)](https://commons.wikimedia.org/wiki/File:Sheep_grazing_in_the_countryside.webm)
- [Work With Sounds, Loom recording (CC BY 4.0)](https://commons.wikimedia.org/wiki/File:WWS_Loom.ogg)

Primary factual references: [Nepal Trade & Export Promotion Centre on Chyangra pashmina](https://tepc.gov.np/major_products/full_content/pashmina-products), [Nepal Pashmina Industries Association](https://nepalpashmina.org.np/html/about-history.php).

## Further acceptance gates
1. Build with pinned Video.js 10.4.0 and compile TS in CI.
2. Test actual metadata loads in Chromium (not just synthetic screenshots); inspect no-chapters, invalid cues, 240px, audio tag and backup.
3. Reopen external source videos after publication, record playback time advancement and CORS/codec/browser failures. Provide visible source provenance.
4. On a physical phone, use gesture seek and ensure no tap-only traps; check rotation.
5. Verify VoiceOver/NVDA and 200–400% actual browser zoom, captions, RTL, 40-chapter navigation and focus.
6. Only add a real live DVR example after securing an authorized live stream with a functioning seekable range; never fake a "LIVE" badge.
7. Keep rollback source and the original homepage unchanged if companion lab encounters external asset issues.
