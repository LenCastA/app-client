import type { IHourlyLoad } from '#shared/domain/types/hourly-load'

/**
 * Robustly checks if an hourly load belongs to the 2026-2 academic period by name.
 */
export function is2026_2HourlyLoad(
  load?: Pick<IHourlyLoad, 'name'> | null,
): boolean {
  if (!load?.name) return false
  return /(?:20)?26-2/i.test(load.name)
}

/**
 * Resolves the default hourly load ID to select according to business rules:
 * 1. Priority 1: 2026-2 load if it exists anywhere in availableLoads (regardless of array order or saved store load).
 * 2. Priority 2: Saved load from store if it is available in availableLoads.
 * 3. Priority 3: Fallback to availableLoads[0].
 */
export function selectDefaultHourlyLoadId(
  availableLoads: Pick<IHourlyLoad, 'id' | 'name'>[],
  savedHourlyLoadId?: number | null,
): number | undefined {
  if (!availableLoads || availableLoads.length === 0) return undefined

  // 1. Absolute priority: 2026-2 load if available
  const load2026_2 = availableLoads.find((load) => is2026_2HourlyLoad(load))
  if (load2026_2) {
    return load2026_2.id
  }

  // 2. Saved load if available
  if (savedHourlyLoadId != null) {
    const savedLoad = availableLoads.find(
      (load) => load.id === savedHourlyLoadId,
    )
    if (savedLoad) {
      return savedLoad.id
    }
  }

  // 3. Fallback to first item
  return availableLoads[0]?.id
}
