'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getMemories, deleteMemory, updateMemory, formatRelativeTime, type Memory } from '@/lib/store'

const TABS = ['All', 'Facts', 'Episodes', 'Skills', 'Disabled']

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 0.9 ? '#10b981' : value >= 0.7 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div style={{ height: '100%', borderRadius: 2, background: color, width: `${value * 100}%`, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, mono', color: 'var(--text-muted)', minWidth: 32 }}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  )
}

function MemoryCard({ memory, onToggle, onDelete, onConfirm }: {
  memory: Memory
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onConfirm: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const typeConfig = {
    FACT: { className: 'badge-fact' },
    EPISODE: { className: 'badge-episode' },
    SKILL: { className: 'badge-skill' },
  }
  const cfg = typeConfig[memory.type] || typeConfig.FACT

  return (
    <div className="glass-card animate-slide-in" style={{ padding: '16px 20px', opacity: memory.enabled ? 1 : 0.5, transition: 'all 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${cfg.className}`}>{memory.type}</span>
            {memory.confirmed
              ? <span style={{ fontSize: 11, color: '#10b981' }}>✓ Confirmed</span>
              : <button onClick={() => onConfirm(memory.id)} style={{ fontSize: 11, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>⚠ Confirm</button>
            }
            {!memory.enabled && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Disabled</span>}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 8 }}>
            {expanded || memory.content.length <= 120
              ? memory.content
              : memory.content.slice(0, 120) + '...'}
          </p>
          {memory.content.length > 120 && (
            <button onClick={() => setExpanded(!expanded)} style={{ fontSize: 12, color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <ConfidenceBar value={memory.confidence} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>📌 {memory.source}</span>
          <span>🕐 {formatRelativeTime(memory.lastUsed)}</span>
          <span>📅 {new Date(memory.createdAt).toLocaleDateString()}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onToggle(memory.id)} style={{ padding: '3px 10px', borderRadius: 6, background: memory.enabled ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${memory.enabled ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, color: memory.enabled ? '#fcd34d' : '#6ee7b7', fontSize: 11, cursor: 'pointer' }}>
            {memory.enabled ? 'Disable' : 'Enable'}
          </button>
          <button onClick={() => onDelete(memory.id)} style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 11, cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMemories(getMemories())
    setMounted(true)
  }, [])

  const handleToggle = (id: string) => {
    const mem = memories.find(m => m.id === id)
    if (mem) updateMemory(id, { enabled: !mem.enabled })
    setMemories(getMemories())
  }

  const handleDelete = (id: string) => {
    deleteMemory(id)
    setMemories(getMemories())
  }

  const handleConfirm = (id: string) => {
    updateMemory(id, { confirmed: true })
    setMemories(getMemories())
  }

  const filtered = memories.filter(m => {
    const matchTab =
      activeTab === 'All' ? true :
      activeTab === 'Facts' ? m.type === 'FACT' :
      activeTab === 'Episodes' ? m.type === 'EPISODE' :
      activeTab === 'Skills' ? m.type === 'SKILL' :
      activeTab === 'Disabled' ? !m.enabled : true
    const matchSearch = !search || m.content.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const stats = {
    facts: memories.filter(m => m.type === 'FACT' && m.enabled).length,
    episodes: memories.filter(m => m.type === 'EPISODE' && m.enabled).length,
    skills: memories.filter(m => m.type === 'SKILL' && m.enabled).length,
    disabled: memories.filter(m => !m.enabled).length,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="orb" style={{ width: 500, height: 500, background: 'radial-gradient(circle, #8b5cf6, transparent)', top: -100, right: -100 }} />

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧠</div>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>MINDORA</span>
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <h1 style={{ fontWeight: 600, fontSize: 16 }}>Memory Center</h1>
          </div>
          <Link href="/chat" className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>← Chat</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'Facts', value: stats.facts, icon: '📌', color: '#8b5cf6' },
            { label: 'Episodes', value: stats.episodes, icon: '📖', color: '#06b6d4' },
            { label: 'Skills', value: stats.skills, icon: '⚙️', color: '#10b981' },
            { label: 'Disabled', value: stats.disabled, icon: '🚫', color: '#6b7280' },
          ].map(s => (
            <div key={s.label} className="glass-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search memories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ maxWidth: 280 }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: activeTab === tab ? 'rgba(139,92,246,0.2)' : 'transparent', border: activeTab === tab ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent', color: activeTab === tab ? '#a78bfa' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {mounted && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>No memories yet</p>
            <p style={{ fontSize: 14, marginBottom: 24 }}>
              {search ? 'No memories match your search.' : 'Chat with MINDORA and it will automatically extract and remember things about you.'}
            </p>
            <Link href="/chat" className="btn-primary">Start a Conversation →</Link>
          </div>
        )}

        {/* Memory list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(m => (
            <MemoryCard key={m.id} memory={m} onToggle={handleToggle} onDelete={handleDelete} onConfirm={handleConfirm} />
          ))}
        </div>
      </div>
    </div>
  )
}
