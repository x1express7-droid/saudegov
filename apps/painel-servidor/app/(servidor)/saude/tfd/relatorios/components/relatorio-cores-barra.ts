// BLOCO-13-RELATORIOS
export const BADGE_COLOR_TO_BAR: Record<string, string> = {
  gray: 'bg-[var(--color-text-muted)]',
  blue: 'bg-[var(--color-info)]',
  green: 'bg-[var(--color-success)]',
  red: 'bg-[var(--color-error)]',
  yellow: 'bg-[var(--color-warning)]',
  orange: 'bg-[var(--color-warning)]',
  purple: 'bg-[var(--color-primary)]',
  teal: 'bg-[var(--color-success)]',
  cyan: 'bg-[var(--color-info)]',
  indigo: 'bg-[var(--color-primary)]',
  emerald: 'bg-[var(--color-success)]',
  slate: 'bg-[var(--color-text-muted)]',
}

export function barClassFromBadgeColor(color: string): string {
  return BADGE_COLOR_TO_BAR[color] ?? 'bg-[var(--color-text-muted)]'
}
