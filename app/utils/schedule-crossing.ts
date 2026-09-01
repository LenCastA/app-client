type TimeRange = {
  startTime: string
  endTime: string
}

const timeInMinutes = (value: string) => {
  const time = value.includes('T') ? (value.split('T')[1] ?? value) : value
  const [hours = 0, minutes = 0, seconds = 0] = time
    .replace('Z', '')
    .split(':')
    .map(Number)

  return hours * 60 + minutes + seconds / 60
}

export const crossingDurationHours = (first: TimeRange, second: TimeRange) =>
  Math.max(
    0,
    Math.min(timeInMinutes(first.endTime), timeInMinutes(second.endTime)) -
      Math.max(timeInMinutes(first.startTime), timeInMinutes(second.startTime)),
  ) / 60

export const formatCrossingDuration = (hours: number) =>
  `${Number(hours.toFixed(2)).toString().replace('.', ',')} h`
