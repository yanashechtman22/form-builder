export function formatAbsoluteDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string, now = Date.now()): string {
  const then = new Date(value).getTime();
  const deltaSeconds = Math.round((then - now) / 1000);
  const abs = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (abs < 60) {
    return formatter.format(deltaSeconds, "second");
  }
  if (abs < 3600) {
    return formatter.format(Math.round(deltaSeconds / 60), "minute");
  }
  if (abs < 86_400) {
    return formatter.format(Math.round(deltaSeconds / 3600), "hour");
  }
  if (abs < 2_592_000) {
    return formatter.format(Math.round(deltaSeconds / 86_400), "day");
  }
  if (abs < 31_536_000) {
    return formatter.format(Math.round(deltaSeconds / 2_592_000), "month");
  }
  return formatter.format(Math.round(deltaSeconds / 31_536_000), "year");
}
