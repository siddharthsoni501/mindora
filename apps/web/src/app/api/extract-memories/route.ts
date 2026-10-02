import { NextRequest, NextResponse } from 'next/server'

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const EXTRACT_MODEL = process.env.NVIDIA_FAST_MODEL || 'nvidia/nemotron-mini-4b-instruct'

function heuristicExtract(conversation: string): Array<{ type: string; content: string; confidence: number }> {
  const memories: Array<{ type: string; content: string; confidence: number }> = []
  const lines = conversation.split('\n')

  for (const line of lines) {
    if (!line.startsWith('User:')) continue
    const text = line.replace('User:', '').trim()
    const lower = text.toLowerCase()

    // Preferences / Facts
    if (lower.startsWith('remember that') || lower.startsWith('remember:')) {
      const content = text.replace(/^[Rr]emember\s+(that\s+|:\s*)?/, '').trim()
      if (content.length > 5) {
        memories.push({ type: 'FACT', content, confidence: 0.95 })
      }
    } else if (lower.includes('prefer') || lower.includes('preference is')) {
      memories.push({ type: 'FACT', content: text, confidence: 0.92 })
    } else if (lower.startsWith('i work as') || lower.startsWith('my role is') || lower.startsWith('i am a')) {
      memories.push({ type: 'FACT', content: text, confidence: 0.90 })
    }

    // Episodes
    if (lower.startsWith('i completed') || lower.startsWith('we launched') || lower.startsWith('i finished') || lower.startsWith('today i')) {
      memories.push({ type: 'EPISODE', content: text, confidence: 0.88 })
    }

    // Skills
    if (lower.includes('workflow:') || lower.includes('skill:') || lower.includes('routine:')) {
      memories.push({ type: 'SKILL', content: text, confidence: 0.91 })
    }
  }

  return memories
}

export async function POST(req: NextRequest) {
  try {
    const { conversation } = await req.json()
    const apiKey = (process.env.NVIDIA_API_KEY || req.headers.get('x-nvidia-key') || '').trim()

    if (apiKey && apiKey.startsWith('nvapi-')) {
      try {
        const prompt = `Analyze this conversation and extract durable facts, preferences, or important events about the user. Only extract meaningful, lasting information — NOT trivial one-time questions.

Return a JSON array of memory objects. Each object must have:
- "type": "FACT" | "EPISODE" | "SKILL"  
- "content": string (concise, 1-2 sentences)
- "confidence": number between 0.0 and 1.0

FACT = stable preferences, habits, identity info
EPISODE = important event or completed task
SKILL = a reusable workflow the user described

If nothing worth remembering, return an empty array [].

Conversation:
${conversation}

Respond with ONLY valid JSON array, no explanation:`

        const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: EXTRACT_MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 512,
            temperature: 0.3,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const raw = data.choices?.[0]?.message?.content || '[]'
          const jsonMatch = raw.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            const filtered = parsed.filter((m: { confidence: number }) => m.confidence >= 0.7)
            if (filtered.length > 0) {
              return NextResponse.json({ memories: filtered })
            }
          }
        }
      } catch {
        // Fall back to heuristic
      }
    }

    // Heuristic extraction fallback
    const memories = heuristicExtract(conversation || '')
    return NextResponse.json({ memories })
  } catch {
    return NextResponse.json({ memories: [] })
  }
}
