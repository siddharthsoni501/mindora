import { NextRequest, NextResponse } from 'next/server'

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const EXTRACT_MODEL = process.env.NVIDIA_FAST_MODEL || 'nvidia/nemotron-mini-4b-instruct'

export async function POST(req: NextRequest) {
  try {
    const { conversation } = await req.json()
    const apiKey = process.env.NVIDIA_API_KEY || req.headers.get('x-nvidia-key') || ''

    if (!apiKey) {
      return NextResponse.json({ memories: [] })
    }

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

    if (!response.ok) {
      return NextResponse.json({ memories: [] })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || '[]'

    // Parse the JSON from model output
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ memories: [] })

    const memories = JSON.parse(jsonMatch[0])
    // Only keep high-confidence memories
    const filtered = memories.filter((m: { confidence: number }) => m.confidence >= 0.7)

    return NextResponse.json({ memories: filtered })
  } catch {
    return NextResponse.json({ memories: [] })
  }
}
