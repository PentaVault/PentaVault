const LAST_LOGIN_METHOD_COOKIE = 'better-auth.last_used_login_method'

const LOGIN_METHOD_LABELS: Record<string, string> = {
  email: 'Email was last used',
  github: 'GitHub was last used',
  google: 'Google was last used',
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const encodedName = `${encodeURIComponent(name)}=`
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName) || part.startsWith(`${name}=`))

  if (!cookie) {
    return null
  }

  const [, ...valueParts] = cookie.split('=')
  const value = valueParts.join('=')

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function getLastUsedLoginMethod(): string | null {
  return readCookie(LAST_LOGIN_METHOD_COOKIE)
}

export function getLastUsedLoginMethodLabel(method: string | null): string | null {
  if (!method) {
    return null
  }

  return LOGIN_METHOD_LABELS[method] ?? null
}

export function isLastUsedLoginMethod(method: string): boolean {
  return getLastUsedLoginMethod() === method
}
