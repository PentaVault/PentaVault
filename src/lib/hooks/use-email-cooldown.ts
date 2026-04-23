'use client'

import { useEffect, useState } from 'react'

export function useEmailCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (secondsLeft <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [secondsLeft])

  return {
    isOnCooldown: secondsLeft > 0,
    secondsLeft,
    startCooldown(seconds: number) {
      setSecondsLeft(Math.max(0, Math.ceil(seconds)))
    },
  }
}
