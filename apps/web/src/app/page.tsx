'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const features = [
  {
    icon: '🧠',
    title: 'Persistent Memory',
    desc: 'MINDORA remembers facts, episodes, and skills across every conversation.',
    color: '#8b5cf6',
  },
  {
    icon: '🔐',
    title: 'You Own Your Data',
    desc: 'Your memories are stored locally. Export, edit, or delete any time.',
    color: '#06b6d4',
  },
  {
    icon: '⚡',
    title: 'Intelligent Routing',
    desc: 'Automatically routes to fast or reasoning models based on complexity.',
    color: '#10b981',
  },
  {
    icon: '🛠️',
    title: 'Skills & Automations',
    desc: 'Save workflows as reusable skills. Automate repetitive tasks.',
    color: '#f59e0b',
  },
  {
    icon: '🔍',
    title: 'Memory Center',
    desc: 'Full visibility into every memory. See sources, edit, or disable any fact.',
    color: '#ec4899',
  },
  {
    icon: '🛡️',
    title: 'Privacy First',
    desc: 'Sensitive data is never auto-stored. You approve before anything is saved.',
    color: '#6366f1',
  },
]

const stats = [
  { value: '3', label: 'Memory Types' },
  { value: '100%', label: 'User Owned' },
  { value: '2', label: 'AI Models' },
  { value: '∞', label: 'Skills' },
]

const memoryTypes = [
  { type: 'FACT', example: '"Prefers concise responses"', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { type: 'EPISODE', example: '"Completed Python project on Oct 1"', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { type: 'SKILL', example: '"Weekly Planning: read calendar → prioritize → plan"', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
]

export default function Home() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflowX: 'hidden' }}>
      {/* Background orbs */}
      <div className="orb" style={{
        width: 600, height: 600,
        background: 'radial-gradient(circle, #8b5cf6, transparent)',
        top: -100, left: -100,
        animationDuration: '10s',
      }} />
      <div className="orb" style={{
        width: 500, height: 500,
        background: 'radial-gradient(circle, #06b6d4, transparent)',
        top: '30%', right: -100,
        animationDuration: '13s',
        animationDelay: '2s',
      }} />
      <div className="orb" style={{
        width: 400, height: 400,
        background: 'radial-gradient(circle, #6366f1, transparent)',
        bottom: '10%', left: '30%',
        animationDuration: '9s',
        animationDelay: '4s',
      }} />

      {/* Cursor glow */}
      {mounted && (
        <div style={{
          position: 'fixed',
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)',
          left: mousePos.x - 200,
          top: mousePos.y - 200,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'left 0.3s ease, top 0.3s ease',
        }} />
      )}

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(5,5,8,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 40px',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🧠</div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>MINDORA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/memory" className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
            Memory Center
          </Link>
          <Link href="/chat" className="btn-primary" style={{ padding: '8px 20px' }}>
            Open Chat →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        paddingTop: 160, paddingBottom: 100,
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px',
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 20,
          fontSize: 13,
          color: '#a78bfa',
          marginBottom: 32,
          fontWeight: 500,
        }}>
          <div className="pulse-dot" />
          Private · Secure · User-Owned Memory
        </div>

        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 88px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-3px',
          marginBottom: 24,
        }}>
          <span className="gradient-text">Your AI remembers.</span>
          <br />
          <span style={{ color: 'var(--text-primary)' }}>You own the memory.</span>
        </h1>

        <p style={{
          fontSize: 20,
          color: 'var(--text-secondary)',
          maxWidth: 560,
          margin: '0 auto 48px',
          lineHeight: 1.7,
          fontWeight: 400,
        }}>
          MINDORA is a private personal AI with persistent, structured memory.
          Every fact it learns belongs to you — edit, delete, or export anytime.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/chat" className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
            🚀 Start Chatting
          </Link>
          <Link href="/dashboard" className="btn-secondary" style={{ padding: '14px 32px', fontSize: 16 }}>
            📊 Dashboard
          </Link>
          <Link href="/memory" className="btn-secondary" style={{ padding: '14px 32px', fontSize: 16 }}>
            🧠 Memory Center
          </Link>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 40, justifyContent: 'center', marginTop: 72,
          flexWrap: 'wrap',
        }}>
          {stats.map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#8b5cf6', letterSpacing: '-1px' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Memory types showcase */}
      <section style={{ padding: '80px 40px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, marginBottom: 12, letterSpacing: '-1px' }}>
            Three Types of Memory
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 48, fontSize: 16 }}>
            MINDORA structures memory so it's always relevant and always yours.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {memoryTypes.map((m) => (
              <div key={m.type} className="glass-card" style={{ padding: 28 }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '4px 12px',
                  background: m.bg,
                  border: `1px solid ${m.color}33`,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: m.color,
                  letterSpacing: 1,
                  marginBottom: 16,
                  fontFamily: 'JetBrains Mono, mono',
                }}>
                  {m.type}
                </div>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: 'JetBrains Mono, mono',
                }}>
                  {m.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: '80px 40px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, marginBottom: 12, letterSpacing: '-1px' }}>
            Built for <span className="gradient-text">serious use</span>
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 56, fontSize: 16 }}>
            Not a demo. Not a toy. A production-grade Personal AI platform.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {features.map((f) => (
              <div key={f.title} className="glass-card" style={{ padding: 28 }}>
                <div style={{
                  width: 48, height: 48,
                  background: `${f.color}18`,
                  border: `1px solid ${f.color}30`,
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 16,
                }}>{f.icon}</div>
                <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '100px 40px',
        textAlign: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <div className="glass-card" style={{
          maxWidth: 700, margin: '0 auto',
          padding: '60px 40px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.05))',
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 16 }}>
            Ready to remember?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18, marginBottom: 32 }}>
            Start a conversation and watch MINDORA build a memory that belongs to you.
          </p>
          <Link href="/chat" className="btn-primary" style={{ padding: '16px 40px', fontSize: 17 }}>
            Start Your First Conversation →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: 'var(--text-muted)', fontSize: 13,
        position: 'relative', zIndex: 1,
      }}>
        <span>MINDORA — Private Personal AI</span>
        <span>Built for people who value privacy.</span>
      </footer>
    </div>
  )
}
