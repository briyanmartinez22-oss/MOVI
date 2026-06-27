type HydrationScope = 'full' | 'owner';

let hydratedUserId: string | null = null;
let hydratedFull = false;
let hydratedOwner = false;

export function resetProfileHydration(): void {
  hydratedUserId = null;
  hydratedFull = false;
  hydratedOwner = false;
}

export function isProfileHydrated(scope: HydrationScope, userId: string): boolean {
  if (hydratedUserId !== userId) return false;
  return scope === 'owner' ? hydratedOwner : hydratedFull;
}

export function markProfileHydrated(scope: HydrationScope, userId: string): void {
  hydratedUserId = userId;
  if (scope === 'full') hydratedFull = true;
  if (scope === 'owner') hydratedOwner = true;
}

export function markFullProfileHydrated(userId: string): void {
  hydratedUserId = userId;
  hydratedFull = true;
  hydratedOwner = true;
}
