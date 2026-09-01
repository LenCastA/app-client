import { describe, expect, it } from 'vitest'
import {
  crossingDurationHours,
  formatCrossingDuration,
} from '~/utils/schedule-crossing'

describe('schedule crossing duration', () => {
  it('calculates only the overlapping portion', () => {
    expect(
      crossingDurationHours(
        { startTime: '08:00:00', endTime: '10:00:00' },
        { startTime: '09:00:00', endTime: '11:00:00' },
      ),
    ).toBe(1)
  })

  it('formats fractional hours for the diagnosis', () => {
    expect(formatCrossingDuration(1.5)).toBe('1,5 h')
  })
})
