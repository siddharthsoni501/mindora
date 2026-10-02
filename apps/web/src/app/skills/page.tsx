'use client'

import Link from 'next/link'
import { useState } from 'react'

type SkillStep = { action: string; tool?: string }
type Skill = {
  id: string
  name: string
  description: string
  steps: SkillStep[]
  requiredTools: string[]
  enabled: boolean
  runs: number
  lastRun: string
  createdAt: string
  version: number
  type: 'automated' | 'manual'
}

const SAMPLE_SKILLS: Skill[] = [
  {
    id: '1',
    name: 'Weekly Planning',
    description: 'Generates a structured weekly plan based on calendar, tasks, and personal memories.',
    steps: [
      { action: 'Read calendar events for the week', tool: 'calendar' },
      { action: 'Retrieve current task list', tool: 'tasks' },
      { action: 'Retrieve relevant memories (goals, preferences)', tool: 'memory' },
      { action: 'Prioritize tasks by urgency and importance' },
      { action: 'Generate structured weekly plan' },
      { action: 'Save plan to notes', tool: 'notes' },
    ],
    requiredTools: ['calendar', 'tasks', 'notes'],
    enabled: true,
    runs: 8,
    lastRun: '5h ago',
    createdAt: '2026-09-15',
    version: 1.2,
    type: 'automated',
  },
  {
    id: '2',
    name: 'Morning Brief',
    description: 'Generates a personalized morning briefing with emails, news, and daily focus.',
    steps: [
      { action: 'Check unread emails', tool: 'email' },
      { action: 'Summarize top 3 emails' },
      { action: 'Review today\'s calendar events', tool: 'calendar' },
      { action: 'Retrieve daily goals from memory', tool: 'memory' },
      { action: 'Generate morning focus list' },
    ],
    requiredTools: ['email', 'calendar'],
    enabled: false,
    runs: 23,
    lastRun: '1d ago',
    createdAt: '2026-09-20',
    version: 1.0,
    type: 'automated',
  },
  {
    id: '3',
    name: 'Study Planner',
    description: 'Creates a structured study plan from a topic or syllabus, with milestones.',
    steps: [
      { action: 'Retrieve study preferences from memory', tool: 'memory' },
      { action: 'Break topic into subtopics' },
      { action: 'Estimate time per subtopic' },
      { action: 'Schedule study blocks', tool: 'calendar' },
      { action: 'Set milestones and checkpoints' },
    ],
    requiredTools: ['calendar'],
    enabled: true,
    runs: 3,
    lastRun: '1w ago',
    createdAt: '2026-09-28',
    version: 1.0,
    type: 'manual',
  },
]

const TOOL_COLORS: Record<string, string> = {
  calendar: '#8b5cf6',
  tasks: '#06b6d4',
  notes: '#10b981',
  email: '#f59e0b',
  memory: '#6366f1',
}

function SkillCard({ skill, onToggle }: { skill: Skill; onToggle: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="glass-card animate-slide-in" style={{ padding: '24px', opacity: skill.enabled ? 1 : 0.6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: skill.enabled ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)',
              border: `1px solid ${skill.enabled ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>⚙️</div>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{skill.name}</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                  padding: '2px 8px', borderRadius: 4,
                  background: skill.type === 'automated' ? 'rgba(99,102,241,0.12)' : 'rgba(6,182,212,0.12)',
                  color: skill.type === 'automated' ? '#a5b4fc' : '#67e8f9',
                  border: `1px solid ${skill.type === 'automated' ? 'rgba(99,102,241,0.3)' : 'rgba(6,182,212,0.3)'}`,
                  textTransform: 'uppercase' as const,
                }}>
                  {skill.type}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, mono' }}>
                  v{skill.version}
                </span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
            {skill.description}
          </p>

          {/* Required tools */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {skill.requiredTools.map(tool => (
              <span key={tool} style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                background: `${TOOL_COLORS[tool] || '#6b7280'}18`,
                border: `1px solid ${TOOL_COLORS[tool] || '#6b7280'}30`,
                color: TOOL_COLORS[tool] || '#6b7280',
              }}>
                🔧 {tool}
              </span>
            ))}
          </div>

          {/* Steps (expandable) */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#a78bfa', fontSize: 13, padding: 0, marginBottom: expanded ? 14 : 0,
            }}
          >
            <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none' }}>▶</span>
            {expanded ? 'Hide' : 'Show'} {skill.steps.length} steps
          </button>

          {expanded && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {skill.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'rgba(139,92,246,0.15)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#a78bfa',
                    flexShrink: 0, fontFamily: 'JetBrains Mono, mono',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{step.action}</p>
                    {step.tool && (
                      <span style={{
                        fontSize: 11, color: TOOL_COLORS[step.tool] || 'var(--text-muted)',
                        fontFamily: 'JetBrains Mono, mono',
                      }}>🔧 {step.tool}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
          <button
            onClick={() => onToggle(skill.id)}
            style={{
              padding: '6px 14px', borderRadius: 8,
              background: skill.enabled ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${skill.enabled ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
              color: skill.enabled ? '#fcd34d' : '#6ee7b7',
              fontSize: 12, cursor: 'pointer', fontWeight: 500,
            }}
          >
            {skill.enabled ? 'Disable' : 'Enable'}
          </button>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
            <div>🔁 {skill.runs} runs</div>
            <div style={{ marginTop: 2 }}>🕐 {skill.lastRun}</div>
            <div style={{ marginTop: 2 }}>📅 {skill.createdAt}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(SAMPLE_SKILLS)

  const toggleSkill = (id: string) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="orb" style={{ width: 400, height: 400, background: 'radial-gradient(circle, #10b981, transparent)', bottom: 100, left: -100 }} />

      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--border)', padding: '0 40px',
        background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧠</div>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>MINDORA</span>
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <h1 style={{ fontWeight: 600, fontSize: 16 }}>Skills</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/chat" className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }}>← Chat</Link>
            <button className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>+ New Skill</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32 }}>
          Reusable workflows that MINDORA can execute on your behalf. Each skill has explicit steps and required tool permissions.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {skills.map(skill => (
            <SkillCard key={skill.id} skill={skill} onToggle={toggleSkill} />
          ))}
        </div>
      </div>
    </div>
  )
}
