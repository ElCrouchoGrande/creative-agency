'use client'

import { useEffect, useState } from 'react'

export function ScreenWipe() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 450)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null
  return <div className="screen-wipe" />
}
