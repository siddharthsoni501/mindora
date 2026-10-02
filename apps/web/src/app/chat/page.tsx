'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  getConversations, createConversation, saveMessage, getActiveMemories,
  deleteConversation, getNvidiaApiKey, setNvidiaApiKey, saveMemories,
  formatRelativeTime, type Conversation, type Message, type Memory,
} from '@/lib/store'

// ──── API Key Setup Screen ────
function ApiKeySetup({ onSave }: { onSave: (key: string) => void }) {
  const [key, setKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!key.trim().startsWith('nvapi-')) {
      setError('NVIDIA API keys start with "nvapi-"')
      return
    }
    setTesting(true)
    setError('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          userMessage: 'Hello',
          memories: [],
          apiKey: key,
        }),
      })
      if (res.status === 500) {
        const d = await res.json()
        if (d.error?.includes('NVIDIA_API_KEY')) {
          // Key not in env — store in localStorage and use via header
          setNvidiaApiKey(key)
          onSave(key)
          return
        }
      }
      setNvidiaApiKey(key)
      onSave(key)
    } catch {
      setError('Could not connect. Check your key.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div className="glass-card" style={{ maxWidth: 480, width: '100%', padding: '48px 40px', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          borderRadius: 14, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 26, margin: '0 auto 24px',
        }}>🧠</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Connect NVIDIA NIM</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
          MINDORA runs exclusively on NVIDIA&apos;s AI infrastructure.<br />
          Enter your NVIDIA API key to get started.
        </p>

        <div style={{ textAlign: 'left', marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            NVIDIA API Key
          </label>
          <input
            type="password"
            className="input-field"
            placeholder="nvapi-xxxxxxxxxxxxxxxxxxxx"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          {error && <p style={{ color: '#fca5a5', fontSize: 12, marginTop: 6 }}>{error}</p>}
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 15 }}
          onClick={handleSave}
          disabled={testing || !key}
        >
          {testing ? '⏳ Connecting...' : '🚀 Connect to NVIDIA NIM'}
        </button>

        <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 10, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Get your free API key at{' '}
            <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" style={{ color: '#a78bfa' }}>
              build.nvidia.com
            </a>
            {' '}→ API Catalog → Generate Key
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

// ──── Main Chat ────
export default function ChatPage() {
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [activeMemories, setActiveMemories] = useState<Memory[]>([])
  const [showMemPanel, setShowMemPanel] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [newMemories, setNewMemories] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load on mount
  useEffect(() => {
    const key = getNvidiaApiKey()
    setApiKeyState(key || null)
    const convs = getConversations()
    setConversations(convs)
    setActiveMemories(getActiveMemories())
    if (convs.length > 0) {
      setActiveConvId(convs[0].id)
      setMessages(convs[0].messages)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const loadConversation = (convId: string) => {
    const convs = getConversations()
    const conv = convs.find(c => c.id === convId)
    if (conv) {
      setActiveConvId(convId)
      setMessages(conv.messages)
    }
  }

  const newConversation = () => {
    const conv = createConversation()
    setConversations(getConversations())
    setActiveConvId(conv.id)
    setMessages([])
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
        setActiveConvId(null)
        setMessages([])
      }
    }
  }

  const extractMemoriesFromConv = useCallback(async (msgs: Message[]) => {
    if (msgs.length < 2) return
    setExtracting(true)
    try {
      const convText = msgs
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'User' : 'MINDORA'}: ${m.content}`)
        .join('\n')

      const res = await fetch('/api/extract-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-nvidia-key': apiKey || '' },
        body: JSON.stringify({ conversation: convText }),
      })
      const data = await res.json()
      if (data.memories?.length > 0) {
        const saved = saveMemories(
          data.memories.map((m: { type: string; content: string; confidence: number }) => ({
            type: m.type as 'FACT' | 'EPISODE' | 'SKILL',
            content: m.content,
            confidence: m.confidence,
            source: 'conversation',
            sourceConvId: activeConvId || undefined,
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
      // silent fail
    } finally {
      setExtracting(false)
    }
  }, [activeConvId, apiKey])

  const sendMessage = async () => {
    if (!input.trim() || isTyping || !activeConvId) return
    const userText = input.trim()
    setInput('')

    // Save & show user message
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
          'x-nvidia-key': apiKey || '',
        },
        body: JSON.stringify({
          messages: currentMsgs.map(m => ({ role: m.role, content: m.content })),
          userMessage: userText,
          memories: activeMemories.slice(0, 8).map(m => ({ content: m.content, type: m.type })),
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const assistantMsg = saveMessage(activeConvId, {
        role: 'assistant',
        content: data.content,
        model: data.model,
        route: data.route,
        routeReason: data.reason,
      })

      const updatedMsgs = [...currentMsgs, assistantMsg]
      setMessages(updatedMsgs)
      setConversations(getConversations())

      // Extract memories every 4 messages
      if (updatedMsgs.length % 4 === 0) {
        extractMemoriesFromConv(updatedMsgs)
      }
    } catch (err) {
      const errMsg = saveMessage(activeConvId, {
        role: 'assistant',
        content: `⚠️ Error: ${err instanceof Error ? err.message : 'Failed to reach NVIDIA NIM. Check your API key.'}`,
      })
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleSaveKey = (key: string) => {
    setNvidiaApiKey(key)
    setApiKeyState(key)
    // Create first conversation
    const conv = createConversation()
    setConversations([conv])
    setActiveConvId(conv.id)
    setMessages([])
  }

  // Show API key setup if no key
  if (apiKey === null) return null // wait for mount
  if (!apiKey) return <ApiKeySetup onSave={handleSaveKey} />

  // Ensure there's an active conversation
  if (!activeConvId) {
    const conv = createConversation()
    setConversations([conv])
    setActiveConvId(conv.id)
  }

  const formatContent = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(139,92,246,0.15);padding:1px 6px;border-radius:4px;font-family:JetBrains Mono,mono;font-size:12px">$1</code>')
      .replace(/\n/g, '<br/>')

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 260, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🧠</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>MINDORA</div>
            <div style={{ fontSize: 10, color: '#76b900', fontWeight: 600 }}>⬡ NVIDIA NIM</div>
          </div>
        </div>

        {/* New chat */}
        <div style={{ padding: '12px 12px 6px' }}>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '9px 16px' }} onClick={newConversation}>
            + New Conversation
          </button>
        </div>

        {/* New memory badges */}
        {newMemories.length > 0 && (
          <div style={{ padding: '6px 12px' }}>
            {newMemories.map((m, i) => (
              <div key={i} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: 4, fontSize: 11, color: '#6ee7b7' }}>
                🧠 Remembered: {m.slice(0, 50)}...
              </div>
            ))}
          </div>
        )}

        {/* Conversations */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, padding: '0 4px' }}>Recent</div>
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
                {conv.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatRelativeTime(conv.updatedAt)} · {conv.messages.length} msgs</div>
              <button
                onClick={e => handleDeleteConv(conv.id, e)}
                style={{ position: 'absolute', right: 6, top: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 2, opacity: 0.6 }}
              >×</button>
            </div>
          ))}
        </div>

        {/* Nav links */}
        <div style={{ padding: '10px', borderTop: '1px solid var(--border)' }}>
          {[['/', '🏠', 'Home'], ['/dashboard', '📊', 'Dashboard'], ['/memory', '🧠', 'Memory Center'], ['/skills', '⚙️', 'Skills'], ['/tools', '🔧', 'Tools']].map(([href, icon, label]) => (
            <Link key={href} href={href} className="nav-link" style={{ display: 'flex', marginBottom: 1 }}>
              <span>{icon}</span><span>{label}</span>
            </Link>
          ))}
          <button
            onClick={() => { setNvidiaApiKey(''); setApiKeyState('') }}
            style={{ width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 8, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginTop: 4 }}
          >
            🔑 Change API Key
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ height: 58, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="pulse-dot" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {conversations.find(c => c.id === activeConvId)?.title || 'MINDORA'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {activeMemories.length} memories active
              {extracting && ' · extracting...'}
            </span>
          </div>
          <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setShowMemPanel(p => !p)}>
            🧠 {activeMemories.length} Memories
          </button>
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
                  'Remember that I prefer concise answers',
                  'What do you know about me?',
                  'Help me create a weekly planning skill',
                  'Summarize what we\'ve talked about',
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

        {/* Input */}
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
        <div style={{ width: 270, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
              Manage All →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
