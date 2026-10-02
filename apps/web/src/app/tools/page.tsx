'use client'

import Link from 'next/link'
import { useState } from 'react'

type Permission = { action: string; allowed: boolean; requiresApproval: boolean; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED' }
type Tool = { id: string; name: string; icon: string; kind: string; enabled: boolean; riskLevel: string; permissions: Permission[] }

const SAMPLE_TOOLS: Tool[] = [
  {
    id: '1', name: 'Google Calendar', icon: '📅', kind: 'calendar', enabled: true, riskLevel: 'LOW',
    permissions: [
      { action: 'Read calendar events', allowed: true, requiresApproval: false, riskLevel: 'LOW' },
      { action: 'Create calendar event', allowed: false, requiresApproval: true, riskLevel: 'MEDIUM' },
      { action: 'Modify calendar event', allowed: false, requiresApproval: true, riskLevel: 'MEDIUM' },
      { action: 'Delete calendar event', allowed: false, requiresApproval: true, riskLevel: 'HIGH' },
    ],
  },
  {
    id: '2', name: 'Gmail', icon: '✉️', kind: 'email', enabled: false, riskLevel: 'HIGH',
    permissions: [
      { action: 'Read emails', allowed: false, requiresApproval: true, riskLevel: 'MEDIUM' },
      { action: 'Send email', allowed: false, requiresApproval: true, riskLevel: 'HIGH' },
      { action: 'Delete email', allowed: false, requiresApproval: true, riskLevel: 'HIGH' },
    ],
  },
  {
    id: '3', name: 'Notes', icon: '📝', kind: 'notes', enabled: true, riskLevel: 'LOW',
    permissions: [
      { action: 'Read notes', allowed: true, requiresApproval: false, riskLevel: 'LOW' },
      { action: 'Create note', allowed: true, requiresApproval: false, riskLevel: 'LOW' },
      { action: 'Edit note', allowed: true, requiresApproval: false, riskLevel: 'LOW' },
      { action: 'Delete note', allowed: false, requiresApproval: true, riskLevel: 'MEDIUM' },
    ],
  },
  {
    id: '4', name: 'File System', icon: '📁', kind: 'files', enabled: false, riskLevel: 'HIGH',
    permissions: [
      { action: 'Read allowed directories', allowed: false, requiresApproval: true, riskLevel: 'MEDIUM' },
      { action: 'Write to allowed directories', allowed: false, requiresApproval: true, riskLevel: 'HIGH' },
      { action: 'Delete files', allowed: false, requiresApproval: true, riskLevel: 'HIGH' },
    ],
  },
]

const RISK_CONFIG = {
  LOW: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', label: 'LOW' },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: 'MEDIUM' },
  HIGH: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', label: 'HIGH' },
  BLOCKED: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', label: 'BLOCKED' },
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? 'linear-gradient(90deg, #8b5cf6, #6366f1)' : 'rgba(255,255,255,0.1)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', width: 16, height: 16, borderRadius: '50%',
        background: 'white', top: 3,
        left: value ? 21 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

function ToolCard({ tool }: { tool: Tool }) {
  const [expanded, setExpanded] = useState(false)
  const [permissions, setPermissions] = useState(tool.permissions)
  const [enabled, setEnabled] = useState(tool.enabled)

  const togglePermission = (idx: number) => {
    setPermissions(prev => prev.map((p, i) => i === idx ? { ...p, allowed: !p.allowed } : p))
  }

  const riskCfg = RISK_CONFIG[tool.riskLevel as keyof typeof RISK_CONFIG] || RISK_CONFIG.LOW

  return (
    <div className="glass-card" style={{ overflow: 'hidden', opacity: enabled ? 1 : 0.65, transition: 'opacity 0.3s' }}>
      {/* Tool header */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: enabled ? 'rgba(139,92,246,0.12)' : 'rgba(107,114,128,0.12)',
          border: `1px solid ${enabled ? 'rgba(139,92,246,0.3)' : 'rgba(107,114,128,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
        }}>{tool.icon}</div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h3 style={{ fontWeight: 600, fontSize: 15 }}>{tool.name}</h3>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              letterSpacing: 0.5, textTransform: 'uppercase' as const,
              background: riskCfg.bg, border: `1px solid ${riskCfg.border}`, color: riskCfg.color,
            }}>
              {riskCfg.label} RISK
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {permissions.filter(p => p.allowed).length}/{permissions.length} permissions enabled
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{enabled ? 'Enabled' : 'Disabled'}</span>
            <Toggle value={enabled} onChange={() => setEnabled(!enabled)} />
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', color: 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            {expanded ? '▲ Hide' : '▼ Permissions'}
          </button>
        </div>
      </div>

      {/* Permission list */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
          {permissions.map((perm, i) => {
            const risk = RISK_CONFIG[perm.riskLevel]
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < permissions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: risk.bg, border: `1px solid ${risk.border}`, color: risk.color,
                    textTransform: 'uppercase' as const, letterSpacing: 0.5, flexShrink: 0,
                    fontFamily: 'JetBrains Mono, mono',
                  }}>{perm.riskLevel}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{perm.action}</span>
                  {perm.requiresApproval && (
                    <span style={{ fontSize: 11, color: '#f59e0b' }}>⚠ requires approval</span>
                  )}
                </div>
                <Toggle value={perm.allowed} onChange={() => togglePermission(i)} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ToolsPage() {
  const [tools] = useState<Tool[]>(SAMPLE_TOOLS)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="orb" style={{ width: 400, height: 400, background: 'radial-gradient(circle, #f59e0b, transparent)', top: 100, right: -100, opacity: 0.08 }} />

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧠</div>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>MINDORA</span>
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <h1 style={{ fontWeight: 600, fontSize: 16 }}>Tool Permissions</h1>
          </div>
          <Link href="/chat" className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>← Chat</Link>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px' }}>
        {/* Warning */}
        <div style={{
          padding: '16px 20px', marginBottom: 32, borderRadius: 12,
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: '#fcd34d', marginBottom: 4 }}>High-risk actions require your approval</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              MINDORA will never send emails, delete files, or create calendar events without showing you exactly what it will do first. You can approve, modify, or deny any action.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
        </div>
      </div>
    </div>
  )
}
