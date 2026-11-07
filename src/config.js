// Motivele pentru care un produs nu se cumpără. „amanat” e special: la golirea listei,
// produsul revine pe listă în loc să fie arhivat. Textele: t('reason.<id>').
import { t } from './i18n.jsx'

export const SKIP_REASONS = ['scump', 'stoc', 'acasa', 'inutil', 'amanat'].map((id) => ({
  id,
  get label() { return t(`reason.${id}`) },
}))

export const POSTPONED = 'amanat'
export const CUSTOM = 'altul'

export function reasonLabel(item) {
  if (item.reason === CUSTOM) return item.reasonText || t('reasonOther')
  if (item.reason === POSTPONED) return t('reasonPostponed')
  return SKIP_REASONS.find((r) => r.id === item.reason)?.label ?? t('reasonUnknown')
}
