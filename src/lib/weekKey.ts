function isoWeek(date: Date): { year: number; week: number } {
  // Based on ISO week date algorithm.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function weekKeyNow(now = new Date()): string {
  const { year, week } = isoWeek(now);
  const padded = String(week).padStart(2, "0");
  return `${year}-W${padded}`;
}
