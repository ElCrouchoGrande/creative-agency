'use client'

interface AgentPanelProps {
  team: string
  agent: string
  output: string
  status: 'pending' | 'running' | 'complete' | 'failed'
}

export function AgentPanel({ team, agent, output, status }: AgentPanelProps) {
  const agentLabel = agent.replace(/_/g, ' ')
  const teamLabel = team.replace(/_/g, ' ')

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{teamLabel}</p>
          <p className="text-sm font-medium text-gray-900">{agentLabel}</p>
        </div>
        <StatusIndicator status={status} />
      </div>
      <div className="p-4 min-h-24 max-h-64 overflow-y-auto">
        {status === 'pending' && (
          <p className="text-sm text-gray-400 italic">Waiting to start…</p>
        )}
        {status === 'running' && !output && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Thinking…
          </div>
        )}
        {output && status !== 'failed' && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{output}</p>
        )}
        {status === 'failed' && (
          <p className="text-sm text-red-500">Agent failed. Check logs.</p>
        )}
      </div>
    </div>
  )
}

function StatusIndicator({ status }: { status: AgentPanelProps['status'] }) {
  if (status === 'running') {
    return <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
  }
  if (status === 'complete') {
    return <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
  }
  if (status === 'failed') {
    return <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
  }
  return <span className="inline-block w-2 h-2 bg-gray-300 rounded-full" />
}
