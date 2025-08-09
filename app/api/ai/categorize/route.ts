import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-helpers'
import { CategorizeRequestSchema, CategorizeResponseSchema } from '@/lib/validations/ai'
import { validateBody, formatZodError } from '@/lib/validations/middleware'
import { ZodError } from 'zod'

interface ThoughtAnalysis {
  text: string
  nodeData: {
    type: string
    title: string
    description?: string
    tags?: string[]
    urgency?: number
    importance?: number
    dueDate?: { date: string }
    isPersonal?: boolean
    children?: ThoughtAnalysis[] // Support for hierarchical structures
  }
}

interface CategoryResult {
  name: string
  thoughts: ThoughtAnalysis[]
  confidence: number
  reasoning: string
}

async function callOpenAI(text: string) {
  const currentDate = new Date().toISOString()
  
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
          content: `You are an AI assistant that categorizes thoughts and tasks from a brain dump, with special attention to hierarchical relationships.
          
          Current date/time: ${currentDate}
          Use this as reference when interpreting relative dates like "today", "tomorrow", "next week", etc.
          
          IMPORTANT: Detect parent-child task relationships. Look for:
          - Main tasks with subtasks listed beneath them
          - Tasks that mention "including", "such as", "like", "for example"
          - Numbered or bulleted lists under a main topic
          - Tasks that are clearly components of a larger goal
          
          Analyze the provided text and return a JSON response with:
          - categories: Array of category objects with name, thoughts, confidence, and reasoning
          - suggestedCategories: Array of category names that might be useful for organizing these thoughts
          - relationships: Array of thought relationships (optional)
          - suggestions: Array of helpful suggestions
          
          For suggested categories, include both:
          - Categories you've already used
          - Additional categories that might be helpful for future thoughts
          
          For each thought, provide a nodeData object with:
          - type: The node type (goal, project, task, option, idea, question, problem, insight, thought, concern)
          - title: A concise title (max 100 chars)
          - description: The full enhanced description
          - tags: Array of relevant tags
          - urgency: 1-10 scale
          - importance: 1-10 scale
          - dueDate: Object with date property (ISO string) if a deadline is mentioned or implied
          - isPersonal: Boolean indicating if this is a personal vs work task
          - children: Array of child thoughts (same structure) if this is a parent task
          
          Example: "Prepare for work trip" might have children like "pack clothes", "arrange childcare", "prepare electronics"`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return JSON.parse(data.choices[0].message.content)
}

async function callGoogleAI(text: string) {
  const currentDate = new Date().toISOString()
  
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
            text: `Current date/time: ${currentDate}
            Use this as reference when interpreting relative dates like "today", "tomorrow", "next week", etc.
            
            IMPORTANT: Detect parent-child task relationships in the text. Look for:
            - Main tasks with subtasks or details listed
            - Tasks that mention "including", "such as", "need to also"
            - Items that are clearly parts of a larger goal
            
            Analyze this brain dump and categorize the thoughts. Return a JSON object with:
            - categories: Array of category objects, each containing:
              - name: Category name
              - thoughts: Array of thoughts in this category
              - confidence: 0-1 confidence score
              - reasoning: Why these thoughts belong together
            - suggestions: Array of helpful suggestions for the user
            
            For each thought, include a nodeData object with:
            - type: (goal, project, task, option, idea, question, problem, insight, thought, concern)
            - title: Concise title (max 100 chars)
            - description: Enhanced description
            - tags: Relevant tags array
            - urgency: 1-10 scale
            - importance: 1-10 scale
            - dueDate: {date: "ISO string"} if a deadline is mentioned or implied
            - isPersonal: true/false for personal vs work tasks
            - children: Array of child thoughts (same structure) if this is a parent task
            
            Brain dump text:
            ${text}
            
            Also provide suggestedCategories: an array of category names that would be useful for organizing these and similar thoughts.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        }
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google AI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return JSON.parse(data.candidates[0].content.parts[0].text)
}

async function mockCategorize(text: string) {
  // Enhanced mock categorization with hierarchy detection
  const lines = text.split('\n').filter(line => line.trim())
  
  // Look for parent-child patterns
  const processedThoughts: ThoughtAnalysis[] = []
  let currentParent: ThoughtAnalysis | null = null
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    
    // Check if this looks like a parent task (ends with colon, or contains "including", "such as")
    const isParent = trimmedLine.endsWith(':') || 
                    /including|such as|need to also|consists of/i.test(trimmedLine)
    
    // Check if this looks like a child task (starts with dash, bullet, number, or extra indentation)
    const isChild = /^[-•*]\s|^\d+\.\s|^\s{2,}/.test(line)
    
    if (isParent) {
      currentParent = {
        text: trimmedLine.replace(/:$/, ''),
        nodeData: {
          type: 'project',
          title: trimmedLine.replace(/:$/, '').substring(0, 50),
          description: trimmedLine.replace(/:$/, ''),
          tags: ['project'],
          urgency: 6,
          importance: 7,
          children: []
        }
      }
      processedThoughts.push(currentParent)
    } else if (isChild && currentParent && currentParent.nodeData.children) {
      const childText = trimmedLine.replace(/^[-•*]\s|^\d+\.\s/, '')
      currentParent.nodeData.children.push({
        text: childText,
        nodeData: {
          type: 'task',
          title: childText.substring(0, 50),
          description: childText,
          tags: ['subtask'],
          urgency: 5,
          importance: 5
        }
      })
    } else {
      // Regular task without hierarchy
      currentParent = null
      processedThoughts.push({
        text: trimmedLine,
        nodeData: {
          type: 'task',
          title: trimmedLine.substring(0, 50),
          description: trimmedLine,
          tags: ['todo'],
          urgency: 5,
          importance: 5
        }
      })
    }
  })
  
  const categories: CategoryResult[] = [
    {
      name: 'Tasks',
      thoughts: processedThoughts
        .filter(t => /buy|call|schedule|finish|need to|have to|prepare|get ready/i.test(t.text)),
      confidence: 0.8,
      reasoning: 'Action-oriented items that need to be completed',
    },
    {
      name: 'Ideas',
      thoughts: processedThoughts
        .filter(t => /maybe|should|could|what if/i.test(t.text)),
      confidence: 0.7,
      reasoning: 'Thoughts and ideas for consideration',
    },
    {
      name: 'Questions',
      thoughts: processedThoughts
        .filter(t => /\?|how|what|when|where|why/i.test(t.text)),
      confidence: 0.75,
      reasoning: 'Questions that need answers or investigation',
    },
  ]

  // Add suggested categories based on what was found
  const suggestedCategories = ['Tasks', 'Ideas', 'Questions', 'Goals', 'Problems', 'Projects', 'Personal', 'Work']

  return {
    categories: categories.filter(cat => cat.thoughts.length > 0),
    suggestedCategories,
    suggestions: ['Consider breaking down larger tasks into smaller steps', 'Try to identify which items are most urgent'],
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const { user, error } = await verifyAuth(authHeader)
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body with Zod schema
    const { data: validatedData, error: validationError } = await validateBody(
      request,
      CategorizeRequestSchema
    )
    
    if (validationError) {
      return validationError
    }

    const { text, provider = 'mock' } = validatedData!

    let result
    
    // Call appropriate AI provider
    switch (provider) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured')
        }
        result = await callOpenAI(text)
        break
        
      case 'google':
      case 'gemini':
        if (!process.env.GOOGLE_AI_API_KEY) {
          throw new Error('Google AI API key not configured')
        }
        result = await callGoogleAI(text)
        break
        
      case 'mock':
      default:
        result = await mockCategorize(text)
        break
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in categorize:', error)
    
    // Return a basic categorization as fallback
    return NextResponse.json({
      categories: [{
        name: 'Uncategorized',
        thoughts: [{
          text: 'Unable to categorize thoughts',
          nodeData: {
            type: 'thought',
            title: 'Error during categorization',
            tags: ['error'],
          },
        }],
        confidence: 0,
        reasoning: 'An error occurred during categorization',
      }],
      suggestions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}