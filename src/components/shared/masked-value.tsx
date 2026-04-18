type MaskedValueProps = {
  value: string | null
  visible?: boolean
}

export function MaskedValue({ value, visible = false }: MaskedValueProps) {
  if (!value) {
    return <span className="text-muted-foreground">Not available</span>
  }

  if (visible) {
    return <code className="font-mono text-sm">{value}</code>
  }

  const start = value.slice(0, 4)
  const end = value.slice(-4)

  return <code className="font-mono text-sm">{`${start}••••${end}`}</code>
}
