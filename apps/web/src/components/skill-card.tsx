'use client'

import { cn } from '@/lib/utils'

interface SkillCardProps {
  id: string
  name: string
  description: string
  tools: string[]
  runs: number
  onRun?: () => void
  onEdit?: () => void
  onHistory?: () => void
}

export function SkillCard({
  id: _id,
  name,
  description,
  tools,
  runs,
  onRun,
  onEdit,
  onHistory,
}: SkillCardProps) {
  return (
    <div className={cn('rounded-xl border p-5 transition-all')} style={{
      background: 'rgba(255,255,255,0.03)',
      borderColor: 'rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          ⚙️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#f0f0ff' }}>{name}</p>
          <p style={{ fontSize: 13, color: '#8b8ba7', marginBottom: 8 }}>{description}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tools.map((tool, i) => (
              <span key={i} style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 11,
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#a5b4fc',
              }}>
                🔧 {tool}
              </span>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#4a4a6a', flexShrink: 0 }}>{runs} runs</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {onRun && (
          <button onClick={onRun} style={{ padding: '4px 12px', borderRadius: 6, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer' }}>
            ▶ Run
          </button>
        )}
        {onEdit && (
          <button onClick={onEdit} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8b8ba7', fontSize: 12, cursor: 'pointer' }}>
            ✏️ Edit
          </button>
        )}
        {onHistory && (
          <button onClick={onHistory} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8b8ba7', fontSize: 12, cursor: 'pointer' }}>
            📜 History
          </button>
        )}
      </div>
    </div>
  )
}
