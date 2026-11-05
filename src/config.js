// Motivele pentru care un produs nu se cumpără. „amanat” e special: la golirea listei,
// produsul revine pe listă în loc să fie arhivat.
export const SKIP_REASONS = [
  { id: 'scump', label: 'Prea scump' },
  { id: 'stoc', label: 'Nu era pe stoc' },
  { id: 'acasa', label: 'Mai avem acasă' },
  { id: 'inutil', label: 'Nu mai e nevoie' },
  { id: 'amanat', label: 'Amânat (rămâne pe listă)' },
]

export const POSTPONED = 'amanat'
export const CUSTOM = 'altul'

export function reasonLabel(item) {
  if (item.reason === CUSTOM) return item.reasonText || 'Alt motiv'
  if (item.reason === POSTPONED) return 'Amânat'
  return SKIP_REASONS.find((r) => r.id === item.reason)?.label ?? 'Nu s-a cumpărat'
}
