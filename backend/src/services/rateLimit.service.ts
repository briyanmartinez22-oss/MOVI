const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) return false;
  return bucket.count >= max;
}

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Limpia todos los buckets de rate limit (login lockouts, etc.). */
export function clearAllRateLimits() {
  buckets.clear();
}

/** Limpia lockouts de login para teléfonos dados (canónico E.164 recomendado). */
export function clearLoginLockoutsForPhones(phoneNumbers: string[]) {
  for (const phone of phoneNumbers) {
    resetRateLimit(`login-fail:${phone}`);
  }
}

export function clearAllLoginLockouts() {
  for (const key of buckets.keys()) {
    if (key.startsWith('login-fail:')) {
      buckets.delete(key);
    }
  }
}
