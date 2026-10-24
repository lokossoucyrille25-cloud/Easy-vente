import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine des classes Tailwind conditionnelles sans collision.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formate un montant en Franc CFA (XOF) par défaut ou selon la devise passée en paramètre.
 * Exemple: 12500 -> "12 500 F CFA"
 */
export function formatCurrency(amount: number, currency: string = 'XOF'): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(amount)

  if (currency === 'XOF' || currency === 'FCFA') {
    return `${formatted} F CFA`
  }

  return `${formatted} ${currency}`
}

/**
 * Formate une date au format court adapté à l'usage sur smartphone.
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/**
 * Formate une date avec heure pour les tickets et factures.
 */
export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
