'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getMemories, getConversations, formatRelativeTime, type Memory, type Conversation } from '@/lib/store'

export default function DashboardPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMemories(getMemories())
    setConversations(getConversations())
    setMounted(true)
  }, [])

  const stats = {
    total: memories.filter(m => m.enabled).length,
    facts: memories.filter(m => m.type === 'FACT' && m.enabled).length,
    episodes: memories.filter(m => m.type === 'EPISODE' && m.enabled).length,
    skills: memories.filter(m => m.type === 'SKILL' && m.enabled).length,
    conversations: conversations.length,
    messages: conversations.reduce((acc, c) => acc + c.messages.length, 0),
  }

  // Recent activity from conversations
  const recentActivity = conversations.slice(0, 5).flatMap(c =>
    c.messages.slice(-1).map(m => ({
      text: m.role === 'user' ? `You: ${m.content.slice(0, 50)}` : `MINDORA responded`,
      time: formatRelativeTime(m.timestamp),
      icon: m.role === 'user' ? '👤' : '🧠',
      color: m.role === 'user' ? '#06b6d4' : '#8b5cf6',
    }))
  ).slice(0, 5)

  const recentMemories = memories.slice(0, 5)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="orb" style={{ width: 500, height: 500, background: 'radial-gradient(circle, #6366f1, transparent)', top: 0, left: '30%' }} />

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧠</div>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>MINDORA</span>
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <h1 style={{ fontWeight: 600, fontSize: 16 }}>Dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/memory" className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>🧠 Memory</Link>
            <Link href="/chat" className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>💬 Chat</Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px' }}>
        {/* Welcome */}
        <div className="glass-card" style={{ padding: '28px 32px', marginBottom: 28, background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.05))', border: '1px solid rgba(139,92,246,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Welcome back 👋</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                {mounted && stats.total > 0
                  ? <>MINDORA has <strong style={{ color: '#a78bfa' }}>{stats.total} active memories</strong> about you.</>
                  : 'Start chatting — MINDORA will learn about you automatically.'
                }
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#76b900', fontWeight: 600 }}>⬡ NVIDIA NIM</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nemotron models</span>
              </div>
            </div>
            <Link href="/chat" className="btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>Start Chatting →</Link>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Memories', value: stats.total, sub: `${stats.facts} facts · ${stats.episodes} episodes`, icon: '🧠', color: '#8b5cf6' },
            { label: 'Conversations', value: stats.conversations, sub: `${stats.messages} messages total`, icon: '💬', color: '#06b6d4' },
            { label: 'Skills', value: stats.skills, sub: 'Reusable workflows', icon: '⚙️', color: '#10b981' },
            { label: 'Unconfirmed', value: memories.filter(m => !m.confirmed && m.enabled).length, sub: 'Pending your review', icon: '⚠️', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: s.color, letterSpacing: '-1px' }}>{mounted ? s.value : '—'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.sub}</div>
                </div>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Recent memories */}
            <div className="glass-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 600, fontSize: 14 }}>Recent Memories</h3>
                <Link href="/memory" style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none' }}>View all →</Link>
              </div>
              {!mounted || recentMemories.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
                  No memories yet. Chat to let MINDORA learn about you.
                </p>
              ) : (
                recentMemories.map((m, i) => (
                  <div key={m.id} style={{ padding: '10px 0', borderBottom: i < recentMemories.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span className={`badge badge-${m.type.toLowerCase()}`} style={{ flexShrink: 0, marginTop: 2 }}>{m.type}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{m.content.slice(0, 80)}{m.content.length > 80 ? '...' : ''}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatRelativeTime(m.createdAt)}</p>
                    </div>
                    <span style={{ fontSize: 10, color: m.confirmed ? '#10b981' : '#f59e0b', flexShrink: 0 }}>
                      {m.confirmed ? '✓' : '?'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Recent conversations */}
            <div className="glass-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 600, fontSize: 14 }}>Recent Conversations</h3>
                <Link href="/chat" style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none' }}>Open chat →</Link>
              </div>
              {!mounted || conversations.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No conversations yet.</p>
              ) : (
                conversations.slice(0, 4).map((c, i) => (
                  <div key={c.id} style={{ padding: '10px 0', borderBottom: i < Math.min(conversations.length, 4) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{c.title.slice(0, 50)}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.messages.length} messages</p>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatRelativeTime(c.updatedAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Activity */}
            <div className="glass-card" style={{ padding: '22px' }}>
              <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Recent Activity</h3>
              {!mounted || recentActivity.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No activity yet.</p>
              ) : (
                recentActivity.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}18`, border: `1px solid ${a.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{a.icon}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{a.text}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{a.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick actions */}
            <div className="glass-card" style={{ padding: '22px' }}>
              <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { href: '/chat', icon: '💬', label: 'New Conversation' },
                  { href: '/memory', icon: '🧠', label: 'View Memories' },
                  { href: '/skills', icon: '⚙️', label: 'Manage Skills' },
                  { href: '/tools', icon: '🔧', label: 'Tool Permissions' },
                ].map(item => (
                  <Link key={item.href} href={item.href} className="btn-secondary" style={{ justifyContent: 'flex-start' }}>
                    <span>{item.icon}</span><span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div className="glass-card" style={{ padding: '18px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div className="pulse-dot" />
                <h3 style={{ fontWeight: 600, fontSize: 13, color: '#6ee7b7' }}>Privacy Status</h3>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                ✓ Memories stored on your device<br />
                ✓ Conversations stored locally<br />
                ✓ Powered by NVIDIA NIM only<br />
                ✓ No third-party data sharing
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
