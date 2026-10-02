// Persistent client-side store using localStorage

export type MemoryType = 'FACT' | 'EPISODE' | 'SKILL'

export interface Memory {
  id: string
  type: MemoryType
  content: string
  confidence: number
  source: string
  sourceConvId?: string
  confirmed: boolean
  enabled: boolean
  createdAt: string
  lastUsed: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  route?: string
  routeReason?: string
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

// ──── Memories ────

export function getMemories(): Memory[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('mindora_memories') || '[]')
  } catch {
    return []
  }
}

export function saveMemory(memory: Omit<Memory, 'id' | 'createdAt'>): Memory {
  const memories = getMemories()
  const newMemory: Memory = {
    ...memory,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  memories.unshift(newMemory)
  localStorage.setItem('mindora_memories', JSON.stringify(memories))
  return newMemory
}

export function saveMemories(newMemories: Omit<Memory, 'id' | 'createdAt'>[]): Memory[] {
  const saved: Memory[] = []
  for (const m of newMemories) {
    // Dedup: skip if very similar content already exists
    const existing = getMemories()
    const isDuplicate = existing.some(e =>
      e.enabled &&
      e.type === m.type &&
      similarity(e.content, m.content) > 0.8
    )
    if (!isDuplicate) {
      saved.push(saveMemory(m))
    }
  }
  return saved
}

export function updateMemory(id: string, updates: Partial<Memory>): void {
  const memories = getMemories()
  const idx = memories.findIndex(m => m.id === id)
  if (idx !== -1) {
    memories[idx] = { ...memories[idx], ...updates }
    localStorage.setItem('mindora_memories', JSON.stringify(memories))
  }
}

export function deleteMemory(id: string): void {
  const memories = getMemories().filter(m => m.id !== id)
  localStorage.setItem('mindora_memories', JSON.stringify(memories))
}

export function getActiveMemories(): Memory[] {
  return getMemories().filter(m => m.enabled)
}

// ──── Conversations ────

export function getConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('mindora_conversations') || '[]')
  } catch {
    return []
  }
}

export function getConversation(id: string): Conversation | null {
  return getConversations().find(c => c.id === id) || null
}

export function createConversation(): Conversation {
  const conv: Conversation = {
    id: crypto.randomUUID(),
    title: 'New conversation',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const convs = getConversations()
  convs.unshift(conv)
  localStorage.setItem('mindora_conversations', JSON.stringify(convs))
  return conv
}

export function saveMessage(convId: string, message: Omit<Message, 'id' | 'timestamp'>): Message {
  const conversations = getConversations()
  const idx = conversations.findIndex(c => c.id === convId)
  if (idx === -1) return { ...message, id: '', timestamp: new Date().toISOString() }

  const newMsg: Message = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  }
  conversations[idx].messages.push(newMsg)
  conversations[idx].updatedAt = new Date().toISOString()

  // Auto-title from first user message
  if (conversations[idx].title === 'New conversation' && message.role === 'user') {
    conversations[idx].title = message.content.slice(0, 50)
  }

  localStorage.setItem('mindora_conversations', JSON.stringify(conversations))
  return newMsg
}

export function deleteConversation(id: string): void {
  const convs = getConversations().filter(c => c.id !== id)
  localStorage.setItem('mindora_conversations', JSON.stringify(convs))
}

// ──── NVIDIA API Key ────

export function getNvidiaApiKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('mindora_nvidia_key') || ''
}

export function setNvidiaApiKey(key: string): void {
  localStorage.setItem('mindora_nvidia_key', key)
}

// ──── Helpers ────

function similarity(a: string, b: string): number {
  const la = a.toLowerCase()
  const lb = b.toLowerCase()
  if (la === lb) return 1
  const longer = la.length > lb.length ? la : lb
  const shorter = la.length > lb.length ? lb : la
  if (longer.includes(shorter)) return shorter.length / longer.length
  // Simple word overlap
  const wa = new Set(la.split(/\s+/))
  const wb = new Set(lb.split(/\s+/))
  const intersection = Array.from(wa).filter(w => wb.has(w)).length
  return intersection / Math.max(wa.size, wb.size)
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
