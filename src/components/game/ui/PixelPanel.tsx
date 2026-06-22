import type { ReactNode, CSSProperties } from 'react'

interface PixelPanelProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export function PixelPanel({ children, className = '', style, onClick }: PixelPanelProps) {
  return (
    <div className={`pixel-panel ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  )
}
