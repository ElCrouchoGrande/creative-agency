import type { ReactNode, CSSProperties } from 'react'

interface PixelButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'hud'
  active?: boolean
  className?: string
  style?: CSSProperties
}

export function PixelButton({
  children, onClick, disabled, variant = 'default', active, className = '', style
}: PixelButtonProps) {
  const cls = variant === 'hud'
    ? `pixel-button pixel-button-hud ${active ? 'active' : ''} ${className}`
    : `pixel-button ${className}`
  return (
    <button className={cls} style={style} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
