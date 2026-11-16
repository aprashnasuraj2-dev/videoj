export function formatAfterimageTime(value) {
  if (!Number.isFinite(value) || value < 0) return '—:——';
  const total = Math.max(0, Math.round(value));
  const seconds = total % 60;
  const minutesTotal = Math.floor(total / 60);
  const minutes = minutesTotal % 60;
  const hours = Math.floor(minutesTotal / 60);
  const two = number => String(number).padStart(2, '0');
  return hours > 0
    ? String(hours) + ':' + two(minutes) + ':' + two(seconds)
    : two(minutesTotal) + ':' + two(seconds);
}

export function formatAfterimageDelta(value) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.abs(value) < 0.5 ? 0 : Math.round(value);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
  return sign + formatAfterimageTime(Math.abs(rounded));
}
