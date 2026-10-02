import { NextRequest, NextResponse } from 'next/server'

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'

// NVIDIA NIM model routing
const FAST_MODEL = process.env.NVIDIA_FAST_MODEL || 'nvidia/nemotron-mini-4b-instruct'
const REASONING_MODEL = process.env.NVIDIA_REASONING_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct'

function routeModel(userMessage: string): { model: string; route: string; reason: string } {
  const lower = userMessage.toLowerCase()
  const isComplex =
    lower.includes('plan') ||
    lower.includes('analyze') ||
    lower.includes('explain') ||
    lower.includes('compare') ||
    lower.includes('design') ||
    lower.includes('create a skill') ||
    lower.includes('write') ||
    lower.includes('step by step') ||
    userMessage.length > 200

  if (isComplex) {
    return { model: REASONING_MODEL, route: 'Reasoning', reason: 'Complex multi-step request' }
  }
  return { model: FAST_MODEL, route: 'Fast', reason: 'Routine request' }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, userMessage, memories } = await req.json()

    const apiKey = process.env.NVIDIA_API_KEY || req.headers.get('x-nvidia-key') || ''
    if (!apiKey) {
      return NextResponse.json(
        { error: 'NVIDIA_API_KEY not configured. Add it to .env.local or enter it in the app.' },
        { status: 500 }
      )
    }

    const { model, route, reason } = routeModel(userMessage || '')

    // Build system prompt with memory context
    const memoryContext = memories && memories.length > 0
      ? `\n\nKnown facts about this user:\n${memories.map((m: { content: string }) => `- ${m.content}`).join('\n')}`
      : ''

    const systemPrompt = `You are MINDORA, a private personal AI assistant built on NVIDIA's NIM platform. You are helpful, concise, and personalized.

Core principles:
- You remember the user across conversations
- You extract and use memories to personalize responses
- When a user tells you a preference, confirm you've noted it
- If asked to save a skill, describe the steps clearly
- Always be honest about what you can and cannot do
- You run exclusively on NVIDIA AI infrastructure (Nemotron models via NVIDIA NIM)${memoryContext}

Respond naturally and helpfully.`

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10), // last 10 messages for context window
    ]

    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.95,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json(
        { error: `NVIDIA API error (${response.status}): ${errText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || 'No response from model.'

    return NextResponse.json({
      content,
      model: model.split('/').pop(),
      route,
      reason,
      usage: data.usage,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
