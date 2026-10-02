'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  getConversations, createConversation, saveMessage, getActiveMemories,
  deleteConversation, getNvidiaApiKey, setNvidiaApiKey, saveMemories,
  formatRelativeTime, type Conversation, type Message, type Memory,
} from '@/lib/store'

// ──── API Key Modal ────
function ApiKeyModal({
  currentKey,
  onSave,
  onClose,
}: {
  currentKey: string
  onSave: (key: string) => void
  onClose: () => void
}) {
  const [key, setKey] = useState(currentKey)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  const handleSave = async () => {
    if (!key.trim()) {
      onSave('')
      onClose()
      return
    }
    if (!key.trim().startsWith('nvapi-')) {
      setError('NVIDIA API keys typically start with "nvapi-"')
      return
    }
    setTesting(true)
    setError('')
    setStatusMsg('Testing connection to NVIDIA NIM...')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-nvidia-key': key.trim() },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Connection test' }],
          userMessage: 'Connection test',
          memories: [],
        }),
      })

      if (res.ok) {
        setStatusMsg('Connected successfully!')
        setTimeout(() => {
          onSave(key.trim())
          onClose()
        }, 500)
      } else {
        const d = await res.json().catch(() => ({}))
        // Still save key if user wants to use it
        onSave(key.trim())
        onClose()
      }
    } catch {
      onSave(key.trim())
      onClose()
    } finally {
      setTesting(false)
    }
  }

  const handleClearKey = () => {
    setKey('')
    onSave('')
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(5, 5, 8, 0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div className="glass-card animate-slide-in" style={{ maxWidth: 480, width: '100%', padding: '36px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              borderRadius: 10, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 20,
            }}>🧠</div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>NVIDIA NIM Configuration</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nemotron Mini & 70B Models</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', padding: 4 }}
          >×</button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Enter your NVIDIA NIM API key to connect live to cloud Nemotron models. If left blank, MINDORA operates in interactive demo mode with memory extraction.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            NVIDIA API Key
          </label>
          <input
            type="password"
            className="input-field"
            placeholder="nvapi-xxxxxxxxxxxxxxxxxxxxxxxx"
            value={key}
            onChange={e => { setKey(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          {error && <p style={{ color: '#fca5a5', fontSize: 12, marginTop: 6 }}>{error}</p>}
          {statusMsg && <p style={{ color: '#6ee7b7', fontSize: 12, marginTop: 6 }}>{statusMsg}</p>}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', padding: '10px 16px', fontSize: 14 }}
            onClick={handleSave}
            disabled={testing}
          >
            {testing ? '⏳ Verifying...' : key.trim() ? 'Save & Connect' : 'Continue in Demo Mode'}
          </button>
          {currentKey && (
            <button
              className="btn-secondary"
              style={{ padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}
              onClick={handleClearKey}
            >
              Disconnect
            </button>
          )}
        </div>

        <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 8, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Get your key from{' '}
            <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" style={{ color: '#a78bfa', textDecoration: 'underline' }}>
              build.nvidia.com
            </a>
            {' '}→ API Catalog → Generate Key. Stored only in your local browser.
          </p>
        </div>
      </div>
    </div>
  )
}

// ──── Typing Indicator ────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '14px 18px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  )
}

// ──── Model Badge ────
function ModelBadge({ route, reason, model }: { route?: string; reason?: string; model?: string }) {
  if (!route) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
      <span className={`route-badge ${route === 'Fast' ? 'route-fast' : 'route-reasoning'}`}>
        {route === 'Fast' ? '⚡' : '🧠'} NVIDIA · {model || 'Nemotron'} · {route}
      </span>
      {reason && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{reason}</span>}
    </div>
  )
}

// ──── Main Chat Page ────
export default function ChatPage() {
  const [mounted, setMounted] = useState(false)
  const [apiKey, setApiKeyState] = useState<string>('')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [activeMemories, setActiveMemories] = useState<Memory[]>([])
  const [showMemPanel, setShowMemPanel] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [newMemories, setNewMemories] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Initialize client state safely on mount
  useEffect(() => {
    const key = getNvidiaApiKey()
    setApiKeyState(key)

    const convs = getConversations()
    if (convs.length > 0) {
      setConversations(convs)
      setActiveConvId(convs[0].id)
      setMessages(convs[0].messages || [])
    } else {
      const newConv = createConversation()
      const updatedConvs = getConversations()
      setConversations(updatedConvs)
      setActiveConvId(newConv.id)
      setMessages(newConv.messages || [])
    }

    setActiveMemories(getActiveMemories())
    setMounted(true)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const loadConversation = (convId: string) => {
    const convs = getConversations()
    const conv = convs.find(c => c.id === convId)
    if (conv) {
      setActiveConvId(convId)
      setMessages(conv.messages || [])
    }
  }

  const handleNewConversation = () => {
    const conv = createConversation()
    const updated = getConversations()
    setConversations(updated)
    setActiveConvId(conv.id)
    setMessages(conv.messages || [])
    setNewMemories([])
  }

  const handleDeleteConv = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteConversation(id)
    const remaining = getConversations()
    setConversations(remaining)
    if (activeConvId === id) {
      if (remaining.length > 0) {
        loadConversation(remaining[0].id)
      } else {
        const fresh = createConversation()
        const refreshed = getConversations()
        setConversations(refreshed)
        setActiveConvId(fresh.id)
        setMessages(fresh.messages || [])
      }
    }
  }

  const extractMemoriesFromConv = useCallback(async (msgs: Message[], currentConvId: string) => {
    if (msgs.length < 2) return
    setExtracting(true)
    try {
      const convText = msgs
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'User' : 'MINDORA'}: ${m.content}`)
        .join('\n')

      const res = await fetch('/api/extract-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-nvidia-key': apiKey },
        body: JSON.stringify({ conversation: convText }),
      })
      const data = await res.json()
      if (data.memories?.length > 0) {
        const saved = saveMemories(
          data.memories.map((m: { type: string; content: string; confidence: number }) => ({
            type: (m.type as 'FACT' | 'EPISODE' | 'SKILL') || 'FACT',
            content: m.content,
            confidence: m.confidence || 0.85,
            source: 'conversation',
            sourceConvId: currentConvId,
            confirmed: false,
            enabled: true,
            lastUsed: new Date().toISOString(),
          }))
        )
        if (saved.length > 0) {
          setNewMemories(saved.map(s => s.content))
          setActiveMemories(getActiveMemories())
          setTimeout(() => setNewMemories([]), 6000)
        }
      }
    } catch {
      // Non-blocking extraction
    } finally {
      setExtracting(false)
    }
  }, [apiKey])

  const sendMessage = async () => {
    if (!input.trim() || isTyping || !activeConvId) return
    const userText = input.trim()
    setInput('')

    // Save & display user message immediately
    const userMsg = saveMessage(activeConvId, { role: 'user', content: userText })
    const currentMsgs = [...messages, userMsg]
    setMessages(currentMsgs)
    setConversations(getConversations())
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nvidia-key': apiKey,
        },
        body: JSON.stringify({
          messages: currentMsgs.map(m => ({ role: m.role, content: m.content })),
          userMessage: userText,
          memories: activeMemories.slice(0, 8).map(m => ({ content: m.content, type: m.type })),
        }),
      })

      const data = await res.json()
      const content = data.content || (data.error ? `⚠️ Notice: ${data.error}` : 'No response received.')

      const assistantMsg = saveMessage(activeConvId, {
        role: 'assistant',
        content,
        model: data.model || 'nemotron-mini-4b-instruct',
        route: data.route || 'Fast',
        routeReason: data.reason || 'Standard routing',
      })

      const updatedMsgs = [...currentMsgs, assistantMsg]
      setMessages(updatedMsgs)
      setConversations(getConversations())

      // Auto-extract memory every 2 messages
      extractMemoriesFromConv(updatedMsgs, activeConvId)
    } catch (err) {
      const errMsg = saveMessage(activeConvId, {
        role: 'assistant',
        content: `⚠️ Connection error: ${err instanceof Error ? err.message : 'Unable to complete request'}. Please check your connection or API key.`,
      })
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleSaveKey = (key: string) => {
    setNvidiaApiKey(key)
    setApiKeyState(key)
  }

  const formatContent = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(139,92,246,0.15);padding:1px 6px;border-radius:4px;font-family:JetBrains Mono,mono;font-size:12px">$1</code>')
      .replace(/\n/g, '<br/>')

  // Smooth loading shell if not mounted yet
  if (!mounted) {
    return (
      <div style={{
        display: 'flex', height: '100vh', background: 'var(--bg-primary)',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48,
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, animation: 'pulse 1.5s infinite',
        }}>🧠</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading MINDORA...</div>
      </div>
    )
  }

  const activeConv = conversations.find(c => c.id === activeConvId)

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* API Key Modal */}
      {showKeyModal && (
        <ApiKeyModal
          currentKey={apiKey}
          onSave={handleSaveKey}
          onClose={() => setShowKeyModal(false)}
        />
      )}

      {/* Sidebar */}
      <div style={{ width: 260, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧠</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>MINDORA</div>
            <div style={{ fontSize: 10, color: apiKey ? '#76b900' : '#a78bfa', fontWeight: 600 }}>
              {apiKey ? '⬡ NVIDIA NIM Live' : '✦ Demo Mode'}
            </div>
          </div>
        </div>

        {/* New chat button */}
        <div style={{ padding: '12px 12px 6px' }}>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '9px 16px' }} onClick={handleNewConversation}>
            + New Conversation
          </button>
        </div>

        {/* New memory notifications */}
        {newMemories.length > 0 && (
          <div style={{ padding: '6px 12px' }}>
            {newMemories.map((m, i) => (
              <div key={i} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: 4, fontSize: 11, color: '#6ee7b7' }}>
                🧠 Remembered: {m.slice(0, 45)}...
              </div>
            ))}
          </div>
        )}

        {/* Conversations list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, padding: '0 4px' }}>Recent Chats</div>
          {conversations.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 4px' }}>No conversations yet</p>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              style={{
                padding: '9px 10px', borderRadius: 9, cursor: 'pointer', marginBottom: 3,
                background: activeConvId === conv.id ? 'rgba(139,92,246,0.12)' : 'transparent',
                border: `1px solid ${activeConvId === conv.id ? 'rgba(139,92,246,0.25)' : 'transparent'}`,
                transition: 'all 0.15s', position: 'relative',
              }}
              onMouseEnter={e => { if (activeConvId !== conv.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (activeConvId !== conv.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: activeConvId === conv.id ? '#a78bfa' : 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 20 }}>
                {conv.title || 'New conversation'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatRelativeTime(conv.updatedAt)} · {conv.messages?.length || 0} msgs</div>
              <button
                onClick={e => handleDeleteConv(conv.id, e)}
                title="Delete conversation"
                style={{ position: 'absolute', right: 6, top: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 2, opacity: 0.6 }}
              >×</button>
            </div>
          ))}
        </div>

        {/* Navigation & Key config */}
        <div style={{ padding: '10px', borderTop: '1px solid var(--border)' }}>
          {[['/', '🏠', 'Home'], ['/dashboard', '📊', 'Dashboard'], ['/memory', '🧠', 'Memory Center'], ['/skills', '⚙️', 'Skills'], ['/tools', '🔧', 'Tools']].map(([href, icon, label]) => (
            <Link key={href} href={href} className="nav-link" style={{ display: 'flex', marginBottom: 1 }}>
              <span>{icon}</span><span>{label}</span>
            </Link>
          ))}
          <button
            onClick={() => setShowKeyModal(true)}
            style={{
              width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 8,
              background: apiKey ? 'rgba(118,185,0,0.08)' : 'rgba(139,92,246,0.08)',
              border: `1px solid ${apiKey ? 'rgba(118,185,0,0.2)' : 'rgba(139,92,246,0.2)'}`,
              color: apiKey ? '#a3e635' : '#c084fc',
              fontSize: 12, cursor: 'pointer', marginTop: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span>{apiKey ? '✓ NVIDIA NIM Key' : '🔑 Connect NVIDIA Key'}</span>
            <span style={{ fontSize: 10, opacity: 0.8 }}>Edit</span>
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ height: 58, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="pulse-dot" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {activeConv?.title || 'MINDORA'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {activeMemories.length} memories active
              {extracting && ' · extracting...'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowKeyModal(true)}
              style={{
                background: apiKey ? 'rgba(118,185,0,0.1)' : 'rgba(139,92,246,0.1)',
                border: `1px solid ${apiKey ? 'rgba(118,185,0,0.3)' : 'rgba(139,92,246,0.3)'}`,
                color: apiKey ? '#a3e635' : '#c084fc',
                fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
              }}
            >
              {apiKey ? '● NVIDIA NIM Live' : '✦ Demo Mode'}
            </button>
            <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setShowMemPanel(p => !p)}>
              🧠 {activeMemories.length} Memories
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🧠</div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Start a conversation</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                Powered by NVIDIA NIM · Nemotron models
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 500, margin: '0 auto' }}>
                {[
                  'What do you know about me?',
                  'Remember that I prefer concise answers',
                  'Plan a 3-day sprint for our Next.js feature',
                  'Summarize my active skills and memories',
                ].map(p => (
                  <button key={p} onClick={() => { setInput(p); inputRef.current?.focus() }}
                    style={{ padding: '8px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
                  >{p}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className="animate-slide-in" style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 18 }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 30, height: 30, flexShrink: 0, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, marginRight: 10, marginTop: 4 }}>🧠</div>
              )}
              <div style={{ maxWidth: '72%' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(255,255,255,0.04)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  fontSize: 14, lineHeight: 1.7,
                }}>
                  <div dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                </div>
                {msg.role === 'assistant' && (
                  <ModelBadge route={msg.route} reason={msg.routeReason} model={msg.model} />
                )}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {formatRelativeTime(msg.timestamp)}
                </div>
              </div>
              {msg.role === 'user' && (
                <div style={{ width: 30, height: 30, flexShrink: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, marginLeft: 10, marginTop: 4 }}>👤</div>
              )}
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
              <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, marginRight: 10 }}>🧠</div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px' }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(10px)' }}>
          <div id="chat-input-wrapper" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 14px', transition: 'border-color 0.2s' }}
            onFocusCapture={() => { const el = document.getElementById('chat-input-wrapper'); if (el) el.style.borderColor = 'rgba(139,92,246,0.5)' }}
            onBlurCapture={() => { const el = document.getElementById('chat-input-wrapper'); if (el) el.style.borderColor = 'var(--border)' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message MINDORA via NVIDIA NIM... (Shift+Enter for new line)"
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14, resize: 'none', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, maxHeight: 120, overflowY: 'auto' }}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }}
            />
            <button className="btn-primary" onClick={sendMessage} disabled={!input.trim() || isTyping} style={{ padding: '7px 16px', fontSize: 13, flexShrink: 0 }}>
              {isTyping ? '...' : '↑ Send'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
            ⬡ NVIDIA NIM · Nemotron · Your memories stay on your device
          </div>
        </div>
      </div>

      {/* Memory panel */}
      {showMemPanel && (
        <div style={{ width: 280, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>🧠 Active Memories</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Injected into context</div>
            </div>
            <button onClick={() => setShowMemPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {activeMemories.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 4px' }}>
                No memories yet. Chat with MINDORA and it will learn about you automatically.
              </p>
            ) : (
              activeMemories.map(m => (
                <div key={m.id} className="glass-card" style={{ padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className={`badge badge-${m.type.toLowerCase()}`}>{m.type}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, mono' }}>{Math.round(m.confidence * 100)}%</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m.content}</p>
                  <div className="progress-bar" style={{ marginTop: 6 }}>
                    <div className="progress-fill" style={{ width: `${m.confidence * 100}%` }} />
                  </div>
                </div>
              ))
            )}
            <Link href="/memory" className="btn-secondary" style={{ display: 'flex', justifyContent: 'center', marginTop: 6, fontSize: 12 }}>
              Manage All in Memory Center →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
