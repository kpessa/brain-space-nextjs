import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import type { Node, NodeUpdate } from '@/types/node'

interface StandupData {
  nodes: Node[]
  yesterdayNodes?: Node[]
  dateRange: {
    start: string // ISO date
    end: string   // ISO date
  }
}

interface StandupSummary {
  yesterday: string[]
  today: string[]
  blockers: string[]
  highlights: string[]
  metrics: {
    tasksCompleted: number
    nodesCreated: number
    updatesAdded: number
    hoursWorked?: number
  }
}

// Helper to categorize work
function categorizeWork(nodes: Node[]): {
  completed: Node[]
  inProgress: Node[]
  planned: Node[]
  blocked: Node[]
} {
  return {
    completed: nodes.filter(n => n.completed),
    inProgress: nodes.filter(n => !n.completed && n.updates && n.updates.length > 0),
    planned: nodes.filter(n => !n.completed && (!n.updates || n.updates.length === 0)),
    blocked: nodes.filter(n => 
      n.updates?.some(u => 
        u.content.toLowerCase().includes('blocked') || 
        u.content.toLowerCase().includes('waiting') ||
        u.content.toLowerCase().includes('stuck')
      )
    )
  }
}

// Extract key accomplishments from nodes
function extractAccomplishments(nodes: Node[]): string[] {
  const accomplishments: string[] = []
  
  // Completed high-priority items
  const completedHighPriority = nodes.filter(n => 
    n.completed && (n.urgency || 5) + (n.importance || 5) >= 14
  )
  
  // Nodes with significant progress
  const significantProgress = nodes.filter(n => 
    !n.completed && 
    n.updates && 
    n.updates.filter(u => u.type === 'progress').length >= 2
  )
  
  completedHighPriority.forEach(node => {
    accomplishments.push(`Completed: ${node.title}`)
  })
  
  significantProgress.forEach(node => {
    const progressUpdates = node.updates?.filter(u => u.type === 'progress') || []
    if (progressUpdates.length > 0) {
      accomplishments.push(`Made progress on: ${node.title}`)
    }
  })
  
  return accomplishments
}

// Generate AI prompt for standup
function generateStandupPrompt(data: StandupData): string {
  const categorized = categorizeWork(data.nodes)
  const yesterdayCategorized = data.yesterdayNodes ? categorizeWork(data.yesterdayNodes) : null
  
  return `Generate a concise daily standup summary for a software developer/healthcare professional based on the following work items:

YESTERDAY'S WORK (if available):
${yesterdayCategorized ? `
- Completed: ${yesterdayCategorized.completed.map(n => `"${n.title}" (${n.type})`).join(', ') || 'None'}
- In Progress: ${yesterdayCategorized.inProgress.map(n => `"${n.title}"`).join(', ') || 'None'}
` : 'No data available'}

TODAY'S WORK:
- Completed: ${categorized.completed.map(n => `"${n.title}" (${n.type})`).join(', ') || 'None'}
- In Progress: ${categorized.inProgress.map(n => `"${n.title}" with ${n.updates?.length || 0} updates`).join(', ') || 'None'}
- Planned: ${categorized.planned.map(n => `"${n.title}" (priority: ${(n.urgency || 5) + (n.importance || 5)})`).join(', ') || 'None'}

RECENT UPDATES (last 24 hours):
${data.nodes.flatMap(n => 
  (n.updates || [])
    .filter(u => {
      const updateTime = new Date(u.timestamp)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return updateTime > dayAgo
    })
    .map(u => `- [${n.title}] ${u.type}: "${u.content.substring(0, 100)}..."`)
).join('\n') || 'No recent updates'}

POTENTIAL BLOCKERS:
${categorized.blocked.map(n => `"${n.title}": ${n.updates?.find(u => 
  u.content.toLowerCase().includes('blocked') || 
  u.content.toLowerCase().includes('waiting')
)?.content || ''}`).join('\n') || 'None identified'}

Please generate a standup summary with:
1. What I accomplished yesterday (3-5 bullet points, be specific)
2. What I'm working on today (3-5 bullet points, focus on deliverables)
3. Any blockers or challenges (only if present)
4. Optional: One key highlight or win

Format the response in a professional but conversational tone suitable for a daily standup meeting. Be concise and focus on outcomes rather than activities. If dealing with healthcare/patient-related work, keep descriptions appropriately generic for privacy.`
}

async function callOpenAI(prompt: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, professional daily standup summaries for software developers and healthcare professionals. Focus on outcomes and deliverables. Keep patient information generic for privacy.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function callGoogleAI(prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a helpful assistant that creates concise, professional daily standup summaries. Focus on outcomes and deliverables. Keep any patient information generic for privacy.\n\n${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Google AI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

// Generate mock standup response for development
function generateMockStandupResponse(workNodes: Node[], yesterdayNodes?: Node[]): string {
  const categorized = categorizeWork(workNodes)
  const yesterdayCategorized = yesterdayNodes ? categorizeWork(yesterdayNodes) : null
  
  let response = `**Yesterday:**\n`
  
  if (yesterdayCategorized && yesterdayCategorized.completed.length > 0) {
    yesterdayCategorized.completed.slice(0, 3).forEach(node => {
      response += `- Completed ${node.title}\n`
    })
  } else {
    response += `- Reviewed and organized project tasks\n`
    response += `- Updated documentation and project status\n`
  }
  
  response += `\n**Today:**\n`
  
  if (categorized.inProgress.length > 0) {
    categorized.inProgress.slice(0, 3).forEach(node => {
      response += `- Continue working on ${node.title}\n`
    })
  }
  
  if (categorized.planned.length > 0) {
    categorized.planned.slice(0, 2).forEach(node => {
      response += `- Start ${node.title}\n`
    })
  }
  
  if (categorized.inProgress.length === 0 && categorized.planned.length === 0) {
    response += `- Review and prioritize upcoming tasks\n`
    response += `- Update project documentation\n`
  }
  
  if (categorized.blocked.length > 0) {
    response += `\n**Blockers:**\n`
    categorized.blocked.slice(0, 2).forEach(node => {
      response += `- ${node.title} - waiting for dependencies\n`
    })
  }
  
  response += `\n**Highlights:**\n`
  response += `- Made good progress on project goals\n`
  
  return response
}

// Parse AI response into structured format
function parseAIResponse(aiResponse: string): StandupSummary {
  const lines = aiResponse.split('\n').filter(line => line.trim())
  
  const yesterday: string[] = []
  const today: string[] = []
  const blockers: string[] = []
  const highlights: string[] = []
  
  let currentSection = ''
  
  lines.forEach(line => {
    const lowerLine = line.toLowerCase()
    
    if (lowerLine.includes('yesterday') || lowerLine.includes('accomplished')) {
      currentSection = 'yesterday'
    } else if (lowerLine.includes('today') || lowerLine.includes('working on')) {
      currentSection = 'today'
    } else if (lowerLine.includes('blocker') || lowerLine.includes('challenge')) {
      currentSection = 'blockers'
    } else if (lowerLine.includes('highlight') || lowerLine.includes('win')) {
      currentSection = 'highlights'
    } else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
      const content = line.trim().substring(1).trim()
      switch (currentSection) {
        case 'yesterday':
          yesterday.push(content)
          break
        case 'today':
          today.push(content)
          break
        case 'blockers':
          blockers.push(content)
          break
        case 'highlights':
          highlights.push(content)
          break
      }
    }
  })
  
  return {
    yesterday,
    today,
    blockers,
    highlights,
    metrics: {
      tasksCompleted: 0,
      nodesCreated: 0,
      updatesAdded: 0
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nodes, yesterdayNodes, dateRange, provider = 'openai' } = body

    // Optional: Verify Firebase auth token
    const authHeader = request.headers.get('authorization')
    const adminAuth = getAdminAuth()
    if (authHeader && process.env.NODE_ENV === 'production' && adminAuth) {
      try {
        const token = authHeader.replace('Bearer ', '')
        await adminAuth.verifyIdToken(token)
      } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Filter for work nodes only
    const workNodes = nodes.filter((n: Node) => !n.isPersonal)
    const yesterdayWorkNodes = yesterdayNodes?.filter((n: Node) => !n.isPersonal)

    // Generate prompt
    const prompt = generateStandupPrompt({
      nodes: workNodes,
      yesterdayNodes: yesterdayWorkNodes,
      dateRange
    })

    // Call AI service or use mock if no API keys configured
    let aiResponse: string
    
    // Check if we have API keys configured
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY
    const hasGoogleKey = !!process.env.GOOGLE_AI_API_KEY

    if (!hasOpenAIKey && !hasGoogleKey) {
      // Use mock response if no API keys are configured

      aiResponse = generateMockStandupResponse(workNodes, yesterdayWorkNodes)
    } else {
      switch (provider) {
        case 'google':
        case 'gemini':
          if (!process.env.GOOGLE_AI_API_KEY) {
            // Fall back to mock if Google key not configured

            aiResponse = generateMockStandupResponse(workNodes, yesterdayWorkNodes)
          } else {
            aiResponse = await callGoogleAI(prompt)
          }
          break
          
        case 'openai':
        default:
          if (!process.env.OPENAI_API_KEY) {
            // Fall back to mock if OpenAI key not configured

            aiResponse = generateMockStandupResponse(workNodes, yesterdayWorkNodes)
          } else {
            aiResponse = await callOpenAI(prompt)
          }
          break
      }
    }

    // Parse and structure the response
    const summary = parseAIResponse(aiResponse)
    
    // Calculate metrics
    summary.metrics = {
      tasksCompleted: workNodes.filter((n: Node) => n.completed).length,
      nodesCreated: workNodes.filter((n: Node) => {
        const created = new Date(n.createdAt)
        const today = new Date()
        return created.toDateString() === today.toDateString()
      }).length,
      updatesAdded: workNodes.reduce((sum: number, n: Node) => 
        sum + (n.updates?.filter(u => {
          const updated = new Date(u.timestamp)
          const today = new Date()
          return updated.toDateString() === today.toDateString()
        }).length || 0), 0
      ),
    }

    return NextResponse.json({
      summary,
      rawResponse: aiResponse,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate standup summary',
      summary: {
        yesterday: ['Unable to generate summary'],
        today: ['Unable to generate summary'],
        blockers: [],
        highlights: [],
        metrics: {
          tasksCompleted: 0,
          nodesCreated: 0,
          updatesAdded: 0
        }
      }
    }, { status: 500 })
  }
}