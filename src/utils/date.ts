export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getNowIso(): string {
  return new Date().toISOString();
}
