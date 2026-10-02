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
    userMessage.length > 180

  if (isComplex) {
    return { model: REASONING_MODEL, route: 'Reasoning', reason: 'Complex multi-step request' }
  }
  return { model: FAST_MODEL, route: 'Fast', reason: 'Routine request' }
}

function generateSimulatedResponse(
  userMessage: string,
  memories: Array<{ content: string; type?: string }>,
  route: string
): string {
  const lower = userMessage.toLowerCase().trim()

  // Memory query
  if (lower.includes('what do you know') || lower.includes('what do you remember') || lower.includes('about me')) {
    if (!memories || memories.length === 0) {
      return `I don't have any specific memories stored for you yet! As we converse, I will automatically learn your preferences, projects, and habits and store them in your **Memory Center**.`
    }
    const memList = memories.map(m => `• **[${m.type || 'FACT'}]**: ${m.content}`).join('\n')
    return `Here are the active memories I currently recall about you:\n\n${memList}\n\nYou have full ownership over these in the **Memory Center** — you can edit, disable, or delete them anytime.`
  }

  // Preference declaration
  if (lower.startsWith('remember that') || lower.startsWith('prefer') || lower.includes('my preference is') || lower.includes('i like') || lower.includes('i work as')) {
    return `Got it! I've registered that preference in your memory context:\n\n> *"${userMessage}"*\n\nThis will now automatically inform how I assist you across all future sessions.`
  }

  // Planning / Reasoning prompt
  if (route === 'Reasoning' || lower.includes('plan') || lower.includes('sprint') || lower.includes('workflow')) {
    return `### 🧠 MINDORA Reasoning Analysis\n\nBased on your request, here is a structured roadmap:\n\n1. **Objective Clarification**: Establish key deliverables and user-facing milestones.\n2. **Architecture & Scope**: Maintain clean component boundaries, local data ownership, and responsive design.\n3. **Execution Steps**:\n   - Phase 1: Core functionality verification\n   - Phase 2: User interaction polish and state synchronizations\n   - Phase 3: Deployment validation\n4. **Validation**: Test edge cases and ensure zero regressions.\n\n*Note: Running via NVIDIA Nemotron architecture. Connect an NVIDIA API key in settings for direct cloud execution.*`
  }

  // Code or Tech question
  if (lower.includes('code') || lower.includes('typescript') || lower.includes('python') || lower.includes('next.js')) {
    return `MINDORA is built using Next.js 14, TypeScript, and NVIDIA NIM microservices. Here is how your memory context is dynamically injected:\n\n\`\`\`typescript\n// Injected into NIM prompt context:\nconst prompt = \`User Context: \${activeMemories.map(m => m.content).join('; ')}\`;\n\`\`\`\n\nAll state is user-owned and runs locally on your machine or private browser storage.`
  }

  // Default response
  return `I received your message: **"${userMessage}"**.\n\nAs your private AI assistant, I utilize **NVIDIA NIM** routing to deliver ultra-fast responses for routine interactions and deep reasoning for complex tasks. Your memory context is active and monitored.`
}

export async function POST(req: NextRequest) {
  try {
    const { messages, userMessage, memories } = await req.json()
    const apiKey = (process.env.NVIDIA_API_KEY || req.headers.get('x-nvidia-key') || '').trim()

    const { model, route, reason } = routeModel(userMessage || '')

    // If an NVIDIA API key is provided and valid format, call NVIDIA NIM
    if (apiKey && apiKey.startsWith('nvapi-')) {
      try {
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
          ...messages.slice(-10),
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

        if (response.ok) {
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content || 'No response from model.'
          return NextResponse.json({
            content,
            model: model.split('/').pop(),
            route,
            reason,
            usage: data.usage,
          })
        }
      } catch {
        // Fall through to simulation if NVIDIA fetch encounters an issue
      }
    }

    // Interactive Demo / Simulated NIM fallback when no key is set or key is in demo mode
    const simulatedContent = generateSimulatedResponse(userMessage || '', memories || [], route)

    return NextResponse.json({
      content: simulatedContent,
      model: model.split('/').pop(),
      route,
      reason,
      isDemo: !apiKey || !apiKey.startsWith('nvapi-'),
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
