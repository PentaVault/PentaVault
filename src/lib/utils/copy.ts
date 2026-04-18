export async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false
  }

  await navigator.clipboard.writeText(value)
  return true
}
