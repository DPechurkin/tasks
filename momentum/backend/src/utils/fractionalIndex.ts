export function getOrderBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return 1.0
  if (prev === null) return (next as number) - 1.0
  if (next === null) return prev + 1.0
  return (prev + next) / 2
}
