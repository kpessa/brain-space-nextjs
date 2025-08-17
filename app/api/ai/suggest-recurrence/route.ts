import { NextRequest, NextResponse } from 'next/server'
import { createAIService } from '@/services/ai'

export async function POST(request: NextRequest) {
  try {
    const { text, nodeType, dueDate } = await request.json()
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const aiService = createAIService()
    
    const prompt = `Analyze this text and suggest a recurrence pattern for it:
Text: "${text}"
${nodeType ? `Type: ${nodeType}` : ''}
${dueDate ? `Due Date: ${dueDate}` : ''}

Based on the content, determine if this should be a recurring task. Look for:
- Time-based keywords (daily, weekly, monthly, every day, etc.)
- Habit-forming activities (exercise, meditation, review, etc.)
- Regular maintenance tasks
- Periodic check-ins or reports

Return a JSON object with:
{
  "shouldRecur": boolean,
  "confidence": number (0-1),
  "pattern": {
    "frequency": "daily" | "weekly" | "monthly" | "custom",
    "timesPerInterval": number (optional, e.g., 2 for twice daily),
    "timesOfDay": string[] (optional, e.g., ["08:00", "20:00"]),
    "daysOfWeek": string[] (optional, e.g., ["Monday", "Wednesday", "Friday"]),
    "interval": number (optional, for custom patterns),
    "unit": "minutes" | "hours" | "days" | "weeks" | "months" (optional),
    "endDate": string (optional, ISO date)
  },
  "reasoning": string (brief explanation),
  "suggestedTitle": string (optional, if the title should be adjusted for clarity)
}

If the task should not recur, set shouldRecur to false and provide minimal pattern info.`

    const response = await aiService.generateResponse(prompt)
    
    try {
      // Try to parse the response as JSON
      const result = JSON.parse(response)
      return NextResponse.json(result)
    } catch (error) {
      // If parsing fails, return a default non-recurring response
      return NextResponse.json({
        shouldRecur: false,
        confidence: 0,
        pattern: null,
        reasoning: "Could not determine recurrence pattern",
        suggestedTitle: null
      })
    }
  } catch (error) {
    // Error suggesting recurrence
    return NextResponse.json(
      { error: 'Failed to suggest recurrence pattern' },
      { status: 500 }
    )
  }
}