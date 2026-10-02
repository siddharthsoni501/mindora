'use client'

import { cn } from '@/lib/utils'

interface MemoryCardProps {
  id: string
  type: 'fact' | 'episode' | 'skill'
  content: string
  confidence: number
  source: string
  createdAt: string
  lastUsedAt?: string | null
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onDisable?: (id: string) => void
  onViewSource?: () => void
}

export function MemoryCard({
  id,
  type,
  content,
  confidence,
  source,
  createdAt,
  lastUsedAt,
  onEdit,
  onDelete,
  onDisable,
  onViewSource,
}: MemoryCardProps) {
  const typeColors: Record<string, string> = {
    fact: '#8b5cf6',
    episode: '#06b6d4',
    skill: '#10b981',
  }
  const color = typeColors[type] || '#8b5cf6'

  return (
    <div className={cn('rounded-xl border p-5 transition-all')} style={{
      background: 'rgba(255,255,255,0.03)',
      borderColor: 'rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${color}18`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase',
        }}>
          {type[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: '#f0f0ff' }}>{content}</p>
          <p style={{ fontSize: 12, color: '#8b8ba7' }}>
            {source} · {new Date(createdAt).toLocaleDateString()} · {Math.round(confidence * 100)}%
          </p>
          {lastUsedAt && (
            <p style={{ fontSize: 12, color: '#4a4a6a', marginTop: 2 }}>Last used: {lastUsedAt}</p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {onViewSource && (
          <button onClick={onViewSource} title="View source" style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8b8ba7', fontSize: 12, cursor: 'pointer' }}>
            📖 Source
          </button>
        )}
        {onEdit && (
          <button onClick={() => onEdit(id)} title="Edit" style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8b8ba7', fontSize: 12, cursor: 'pointer' }}>
            ✏️ Edit
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(id)} title="Delete" style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 12, cursor: 'pointer' }}>
            🗑️ Delete
          </button>
        )}
        {onDisable && (
          <button onClick={() => onDisable(id)} title="Disable" style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d', fontSize: 12, cursor: 'pointer' }}>
            🔕 Disable
          </button>
        )}
      </div>
    </div>
  )
}
