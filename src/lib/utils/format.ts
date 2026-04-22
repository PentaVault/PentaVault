export function formatDateTime(value: string | Date | null): string {
  if (!value) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatRelativeDate(value: string | Date | null): string {
  if (!value) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function formatNumber(value: number | null): string {
  if (value === null) {
    return 'N/A'
  }

  return new Intl.NumberFormat('en-US').format(value)
}

export function formatCurrency(value: number | null, currency = 'USD'): string {
  if (value === null) {
    return 'N/A'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}
