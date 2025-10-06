// Twilio ConversationRelay Handler with Claude AI
// Supports: Stateful conversations, tool calling, knowledge base access
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.20.0'

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
})

// Conversation state management
const conversationStates = new Map<string, ConversationState>()

interface ConversationState {
  sessionId: string
  callSid: string
  callerNumber: string
  messages: Array<{ role: string; content: any }>
  currentIntent?: string
  context: Record<string, any>
  knowledgeBase: Array<KnowledgeEntry>
  startedAt: Date
}

interface KnowledgeEntry {
  id: string
  category: string
  question: string
  answer: string
}

// Tool definitions for Claude
const tools = [
  {
    name: 'search_knowledge_base',
    description: 'Search the restaurant knowledge base for information about hours, menu, location, etc.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['hours', 'menu', 'location', 'dietary', 'specials', 'catering', 'general'],
          description: 'Category to search in'
        },
        query: {
          type: 'string',
          description: 'The question or topic to search for'
        }
      },
      required: ['category', 'query']
    }
  },
  {
    name: 'transfer_to_human',
    description: 'Transfer the call to a human staff member. Use when the AI cannot help or caller explicitly requests to speak with someone.',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for the transfer'
        }
      },
      required: ['reason']
    }
  },
  {
    name: 'take_order',
    description: 'Record an order for the customer. Use when customer wants to place an order.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              notes: { type: 'string' }
            }
          }
        },
        customerName: { type: 'string' },
        phoneNumber: { type: 'string' },
        pickupTime: { type: 'string' }
      },
      required: ['items']
    }
  },
  {
    name: 'leave_voicemail',
    description: 'Record a voicemail message from the caller. Use for feedback, complaints, or questions that need follow-up.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['feedback', 'complaint', 'question', 'compliment'],
          description: 'Type of message'
        },
        message: {
          type: 'string',
          description: 'The voicemail content'
        }
      },
      required: ['category', 'message']
    }
  }
]

serve(async (req) => {
  const url = new URL(req.url)

  // TwiML endpoint - returns initial ConversationRelay configuration
  if (req.method === 'POST' && url.pathname.endsWith('/twiml')) {
    return handleTwiMLRequest(req)
  }

  // WebSocket upgrade for ConversationRelay
  if (req.headers.get('upgrade') === 'websocket') {
    return handleWebSocket(req)
  }

  return new Response('Not Found', { status: 404 })
})

async function handleTwiMLRequest(req: Request) {
  const formData = await req.formData()
  const callSid = formData.get('CallSid')?.toString() || ''
  const from = formData.get('From')?.toString() || ''
  const to = formData.get('To')?.toString() || ''

  console.log(`New call: ${callSid} from ${from} to ${to}`)

  // Generate WebSocket URL
  const wsUrl = `wss://${req.headers.get('host')}/functions/v1/conversation-relay-handler`

  // Return TwiML with ConversationRelay configuration
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect action="https://${req.headers.get('host')}/functions/v1/conversation-relay-handler/status">
    <ConversationRelay
      url="${wsUrl}"
      welcomeGreeting="Thank you for calling Chicago Mike's Beef and Dogs! How can I help you today?"
      voice="ElevenLabs.adam"
      ttsProvider="Google"
      voice="en-US-Neural2-D"
      transcriptionProvider="Deepgram"
      language="en-US"
      dtmfDetection="true"
    >
      <Language
        code="en-US"
        ttsProvider="Google"
        voice="en-US-Neural2-D"
        transcriptionProvider="Deepgram"
        speechModel="nova-2"
      />
      <Language
        code="es-US"
        ttsProvider="Google"
        voice="es-US-Neural2-A"
        transcriptionProvider="Deepgram"
        speechModel="nova-2"
      />
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="from" value="${from}" />
      <Parameter name="to" value="${to}" />
    </ConversationRelay>
  </Connect>
</Response>`

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' }
  })
}

async function handleWebSocket(req: Request) {
  const { socket, response } = Deno.upgradeWebSocket(req)

  let state: ConversationState | null = null

  socket.onopen = () => {
    console.log('WebSocket connected')
  }

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data)
      console.log('Received message:', message.type)

      switch (message.type) {
        case 'setup':
          state = await handleSetup(message, socket)
          break

        case 'prompt':
          if (state) {
            await handlePrompt(message, state, socket)
          }
          break

        case 'interrupt':
          console.log('User interrupted')
          // Could implement interrupt handling here
          break

        case 'dtmf':
          if (state) {
            await handleDTMF(message, state, socket)
          }
          break

        case 'error':
          console.error('ConversationRelay error:', message.description)
          break

        default:
          console.log('Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Error handling message:', error)
    }
  }

  socket.onclose = async () => {
    console.log('WebSocket closed')
    if (state) {
      await saveConversationToDatabase(state)
      conversationStates.delete(state.sessionId)
    }
  }

  socket.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  return response
}

async function handleSetup(message: any, socket: WebSocket): Promise<ConversationState> {
  const { sessionId, callSid, customParameters } = message
  const from = customParameters?.from || 'Unknown'
  const to = customParameters?.to || 'Unknown'

  console.log(`Setup call ${callSid} from ${from}`)

  // Load knowledge base from database
  const knowledgeBase = await loadKnowledgeBase()

  const state: ConversationState = {
    sessionId,
    callSid,
    callerNumber: from,
    messages: [],
    context: {
      businessName: "Chicago Mike's Beef and Dogs",
      hours: "Monday-Thursday 9AM-9PM, Friday-Saturday 9AM-10PM, Sunday 10AM-8PM",
      location: "Chicago, Illinois"
    },
    knowledgeBase,
    startedAt: new Date()
  }

  conversationStates.set(sessionId, state)

  return state
}

async function handlePrompt(message: any, state: ConversationState, socket: WebSocket) {
  const userMessage = message.voicePrompt
  console.log(`User said: "${userMessage}"`)

  // Add user message to conversation history
  state.messages.push({
    role: 'user',
    content: userMessage
  })

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(state)

  // Call Claude with tool calling enabled
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages: state.messages,
    tools: tools,
    stream: true
  })

  let fullResponse = ''
  let toolUse: any = null

  // Stream response tokens back to Twilio
  for await (const event of response) {
    if (event.type === 'content_block_start') {
      if (event.content_block.type === 'tool_use') {
        toolUse = event.content_block
      }
    }

    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        const token = event.delta.text
        fullResponse += token

        // Send token to Twilio for TTS
        socket.send(JSON.stringify({
          type: 'text',
          token: token,
          last: false
        }))
      }

      if (event.delta.type === 'input_json_delta') {
        if (!toolUse.input) toolUse.input = ''
        toolUse.input += event.delta.partial_json
      }
    }

    if (event.type === 'message_delta') {
      if (event.delta.stop_reason === 'tool_use') {
        // Execute tool and continue conversation
        const toolResult = await executeTool(toolUse, state, socket)

        // Send final token marker
        socket.send(JSON.stringify({
          type: 'text',
          token: '',
          last: true
        }))

        // Continue conversation with tool result
        await continueWithToolResult(toolUse, toolResult, state, socket)
        return
      }
    }
  }

  // Send final token marker
  socket.send(JSON.stringify({
    type: 'text',
    token: '',
    last: true
  }))

  // Save assistant response
  state.messages.push({
    role: 'assistant',
    content: fullResponse
  })
}

async function handleDTMF(message: any, state: ConversationState, socket: WebSocket) {
  const digit = message.digit
  console.log(`DTMF pressed: ${digit}`)

  // Handle menu navigation via DTMF
  switch (digit) {
    case '1':
      await sendResponse(socket, "Let me tell you our hours. " + state.context.hours)
      break
    case '2':
      await sendResponse(socket, "I'll transfer you to a team member now.")
      socket.send(JSON.stringify({
        type: 'end',
        handoffData: JSON.stringify({ reason: 'dtmf_transfer' })
      }))
      break
    case '9':
      await sendResponse(socket, "Let me help you leave a message.")
      // Set context for voicemail flow
      state.context.awaitingVoicemail = true
      break
  }
}

async function executeTool(toolUse: any, state: ConversationState, socket: WebSocket): Promise<any> {
  const toolName = toolUse.name
  const toolInput = JSON.parse(toolUse.input)

  console.log(`Executing tool: ${toolName}`, toolInput)

  switch (toolName) {
    case 'search_knowledge_base':
      return await searchKnowledgeBase(toolInput.category, toolInput.query, state.knowledgeBase)

    case 'transfer_to_human':
      socket.send(JSON.stringify({
        type: 'text',
        token: "Let me transfer you to a team member who can better assist you.",
        last: true
      }))
      setTimeout(() => {
        socket.send(JSON.stringify({
          type: 'end',
          handoffData: JSON.stringify({ reason: toolInput.reason })
        }))
      }, 2000)
      return { success: true, message: 'Transferring call' }

    case 'take_order':
      await saveOrderToDatabase(toolInput, state)
      return {
        success: true,
        orderId: `ORD-${Date.now()}`,
        message: 'Order recorded successfully'
      }

    case 'leave_voicemail':
      await saveVoicemailToDatabase(toolInput, state)
      return { success: true, message: 'Voicemail recorded' }

    default:
      return { error: 'Unknown tool' }
  }
}

async function continueWithToolResult(
  toolUse: any,
  toolResult: any,
  state: ConversationState,
  socket: WebSocket
) {
  // Add tool use and result to conversation
  state.messages.push({
    role: 'assistant',
    content: [{ type: 'tool_use', id: toolUse.id, name: toolUse.name, input: JSON.parse(toolUse.input) }]
  })

  state.messages.push({
    role: 'user',
    content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }]
  })

  // Get Claude's response after tool use
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: buildSystemPrompt(state),
    messages: state.messages,
    tools: tools,
    stream: true
  })

  let fullResponse = ''

  for await (const event of response) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      const token = event.delta.text
      fullResponse += token

      socket.send(JSON.stringify({
        type: 'text',
        token: token,
        last: false
      }))
    }
  }

  socket.send(JSON.stringify({
    type: 'text',
    token: '',
    last: true
  }))

  state.messages.push({
    role: 'assistant',
    content: fullResponse
  })
}

function buildSystemPrompt(state: ConversationState): string {
  return `You are a helpful AI assistant for ${state.context.businessName}, a Chicago-style restaurant.

Your role:
- Answer questions about the restaurant (hours, menu, location)
- Take orders from customers
- Handle dietary restrictions and special requests
- Transfer calls when needed
- Take voicemail messages

Business Information:
- Name: ${state.context.businessName}
- Hours: ${state.context.hours}
- Location: ${state.context.location}

Available tools:
- search_knowledge_base: Search for detailed information
- take_order: Record customer orders
- leave_voicemail: Record messages for staff
- transfer_to_human: Transfer to a staff member

Conversation style:
- Be friendly and professional
- Keep responses concise (under 30 seconds when spoken)
- Use natural, conversational language
- Confirm understanding before taking orders
- Ask clarifying questions when needed

Current conversation context: ${JSON.stringify(state.context)}`
}

async function sendResponse(socket: WebSocket, text: string) {
  socket.send(JSON.stringify({
    type: 'text',
    token: text,
    last: true
  }))
}

async function loadKnowledgeBase(): Promise<Array<KnowledgeEntry>> {
  try {
    // In production, load from Supabase
    // For now, return sample data
    return [
      {
        id: '1',
        category: 'hours',
        question: 'What time are you open?',
        answer: "We're open Monday through Thursday 9 AM to 9 PM, Friday and Saturday 9 AM to 10 PM, and Sunday 10 AM to 8 PM."
      },
      {
        id: '2',
        category: 'menu',
        question: 'Do you have Italian beef?',
        answer: "Yes! Our Italian beef sandwich is $8.99 and comes with peppers. You can add cheese for $1 extra."
      },
      {
        id: '3',
        category: 'dietary',
        question: 'Do you have gluten-free options?',
        answer: "Yes, we offer gluten-free buns for all our sandwiches. Just let us know when ordering."
      }
    ]
  } catch (error) {
    console.error('Error loading knowledge base:', error)
    return []
  }
}

async function searchKnowledgeBase(
  category: string,
  query: string,
  knowledgeBase: Array<KnowledgeEntry>
): Promise<any> {
  const results = knowledgeBase.filter(entry =>
    entry.category === category ||
    entry.question.toLowerCase().includes(query.toLowerCase()) ||
    entry.answer.toLowerCase().includes(query.toLowerCase())
  )

  if (results.length === 0) {
    return { found: false, message: 'No matching information found' }
  }

  return {
    found: true,
    results: results.map(r => ({ question: r.question, answer: r.answer }))
  }
}

async function saveOrderToDatabase(orderData: any, state: ConversationState) {
  console.log('Saving order:', orderData)
  // TODO: Implement Supabase integration
}

async function saveVoicemailToDatabase(voicemailData: any, state: ConversationState) {
  console.log('Saving voicemail:', voicemailData)
  // TODO: Implement Supabase integration
}

async function saveConversationToDatabase(state: ConversationState) {
  console.log('Saving conversation:', state.callSid)
  // TODO: Implement Supabase integration to save to voice_calls table
}
