import { describe, expect, it } from 'vitest'
import {
  is2026_2HourlyLoad,
  selectDefaultHourlyLoadId,
} from '../hourly-load-selection'

describe('hourly-load-selection utils', () => {
  describe('is2026_2HourlyLoad', () => {
    it('identifies 2026-2 hourly load names correctly', () => {
      expect(is2026_2HourlyLoad({ name: 'Carga Horaria 2026-2' })).toBe(true)
      expect(is2026_2HourlyLoad({ name: '2026-2_I1' })).toBe(true)
      expect(is2026_2HourlyLoad({ name: '26-2' })).toBe(true)
      expect(is2026_2HourlyLoad({ name: 'CARGA 2026-2' })).toBe(true)
    })

    it('returns false for non-2026-2 loads', () => {
      expect(is2026_2HourlyLoad({ name: 'Carga Horaria 2026-1' })).toBe(false)
      expect(is2026_2HourlyLoad({ name: '2025-2' })).toBe(false)
      expect(is2026_2HourlyLoad(null)).toBe(false)
      expect(is2026_2HourlyLoad(undefined)).toBe(false)
    })
  })

  describe('selectDefaultHourlyLoadId', () => {
    const load2026_1 = { id: 101, name: 'Carga Horaria 2026-1' }
    const load2026_2 = { id: 102, name: 'Carga Horaria 2026-2' }
    const load2025_2 = { id: 100, name: 'Carga Horaria 2025-2' }

    it('selects 2026-2 when both 2026-1 and 2026-2 are available', () => {
      const availableLoads = [load2026_1, load2026_2]
      const selectedId = selectDefaultHourlyLoadId(availableLoads)
      expect(selectedId).toBe(load2026_2.id)
    })

    it('prefers 2026-2 even if store has 2026-1 saved as current load', () => {
      const availableLoads = [load2026_1, load2026_2]
      const storeSavedHourlyLoadId = load2026_1.id
      const selectedId = selectDefaultHourlyLoadId(
        availableLoads,
        storeSavedHourlyLoadId,
      )
      expect(selectedId).toBe(load2026_2.id)
    })

    it('preserves saved store load if 2026-2 does not exist', () => {
      const availableLoads = [load2025_2, load2026_1]
      const storeSavedHourlyLoadId = load2026_1.id
      const selectedId = selectDefaultHourlyLoadId(
        availableLoads,
        storeSavedHourlyLoadId,
      )
      expect(selectedId).toBe(load2026_1.id)
    })

    it('falls back to availableLoads[0] if 2026-2 does not exist and store load is invalid or unset', () => {
      const availableLoads = [load2025_2, load2026_1]
      const selectedIdWithoutStore = selectDefaultHourlyLoadId(availableLoads)
      expect(selectedIdWithoutStore).toBe(load2025_2.id)

      const selectedIdWithMissingStore = selectDefaultHourlyLoadId(
        availableLoads,
        9999,
      )
      expect(selectedIdWithMissingStore).toBe(load2025_2.id)
    })

    it('does not depend on the order of items in availableLoads', () => {
      const orderA = [load2026_1, load2026_2]
      const orderB = [load2026_2, load2026_1]

      expect(selectDefaultHourlyLoadId(orderA)).toBe(load2026_2.id)
      expect(selectDefaultHourlyLoadId(orderB)).toBe(load2026_2.id)
    })

    it('returns undefined if availableLoads is empty', () => {
      expect(selectDefaultHourlyLoadId([])).toBeUndefined()
    })
  })
})
