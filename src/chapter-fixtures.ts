/** Deterministic fixture generator for the public DHAGO stress lab.
 * This is test data, never a claim about the original film's chapter metadata.
 */
export interface ChapterDraft { start: number; end: number; title: string }
export interface ChapterAudit {
  chapters: ChapterDraft[];
  issues: string[];
}
const finite = (n: number) => Number.isFinite(n) && n >= 0;
export function normalizeChapterDrafts(input: readonly ChapterDraft[], duration: number): ChapterAudit {
  const issues: string[] = [];
  const length = finite(duration) && duration > 0 ? duration : Infinity;
  const valid = input.flatMap((c, index) => {
    if (!finite(c.start) || !finite(c.end) || c.end <= c.start) {
      issues.push(`Dropped invalid chapter ${index + 1}`);
      return [];
    }
    const start = Math.min(c.start, length);
    const end = Math.min(c.end, length);
    if (start >= end) {
      issues.push(`Dropped out-of-range chapter ${index + 1}`);
      return [];
    }
    if (end !== c.end) issues.push(`Clamped chapter ${index + 1} to duration`);
    return [{start, end, title: String(c.title || 'Untitled chapter'), originalIndex: index}];
  });
  valid.sort((a,b) => a.start - b.start || a.originalIndex - b.originalIndex);
  if (valid.some((c,i)=>c.originalIndex !== i)) issues.push('Sorted out-of-order chapters');
  const chapters: ChapterDraft[] = [];
  for (let i = 0; i < valid.length; i++) {
    const current = valid[i];
    const next = valid[i+1];
    const end = next && next.start < current.end ? next.start : current.end;
    if (end < current.end) issues.push(`Resolved overlapping chapter at ${current.start}s`);
    if (end <= current.start) {
      issues.push(`Discarded completely obscured chapter at ${current.start}s`);
      continue;
    }
    if (chapters.length && current.start > chapters[chapters.length-1].end)
      issues.push(`Preserved unlabeled gap before ${current.start}s`);
    chapters.push({ start: current.start, end, title: current.title });
  }
  return {chapters, issues};
}
export function chapterVtt(chapters: readonly ChapterDraft[]): string {
  const time = (s:number) => {
    const ms=Math.round(s*1000), hour=Math.floor(ms/3600000);
    const min=Math.floor(ms/60000)%60, sec=Math.floor(ms/1000)%60, rem=ms%1000;
    return [hour,min,sec].map(x=>String(x).padStart(2,'0')).join(':')+'.'+String(rem).padStart(3,'0');
  };
  return 'WEBVTT\n\n'+chapters.map((c,i)=>`${i+1}\n${time(c.start)} --> ${time(c.end)}\n${c.title.replaceAll(/[\r\n]/g,' ')}\n`).join('\n');
}
export function denseChapters(duration:number): ChapterDraft[] {
  return Array.from({length:40},(_,i)=>({
    start: i*duration/40,
    end: (i+1)*duration/40,
    title: `Fibre study ${String(i+1).padStart(2,'0')}`
  }));
}
