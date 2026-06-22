import type { AgentRunStatus } from '@/lib/types'

interface PixelLedProps {
  status: AgentRunStatus | 'fun'
}

export function PixelLed({ status }: PixelLedProps) {
  const cls =
    status === 'running'  ? 'pixel-led pixel-led--run'  :
    status === 'complete' ? 'pixel-led pixel-led--done' :
    status === 'failed'   ? 'pixel-led pixel-led--fail' :
    status === 'fun'      ? 'pixel-led pixel-led--fun'  :
                            'pixel-led pixel-led--wait'
  return <span className={cls} />
}
