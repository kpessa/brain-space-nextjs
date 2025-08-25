import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { text, isWorkNode, updateType, provider = 'mock' } = await request.json()
    
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }
    
    // Construct prompts based on node type and update type
    const systemPrompt = isWorkNode
      ? `You are a professional writing assistant. Format this work update to be clear, concise, and professional.
         Guidelines:
         - Use bullet points if there are multiple items
         - Be action-oriented and specific
         - Highlight accomplishments, progress, and next steps
         - Use professional language
         - Keep it concise but informative
         ${updateType === 'progress' ? '- Focus on what was accomplished and what percentage complete' : ''}
         ${updateType === 'status' ? '- Focus on current state and any blockers' : ''}
         
         Return only the enhanced text, no explanations.`
      : `You are a friendly writing assistant. Improve this personal update to be clear and readable.
         Guidelines:
         - Make it easy to read and understand
         - Keep a casual, personal tone
         - Fix any grammar or spelling issues
         - Maintain the original intent and emotion
         - Add structure if needed but keep it natural
         
         Return only the enhanced text, no explanations.`
    
    let enhancedText = text
    
    // Process based on provider
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        enhancedText = data.choices[0]?.message?.content || text
      }
    } 
    else if ((provider === 'google' || provider === 'gemini') && process.env.GOOGLE_AI_API_KEY) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nText to enhance:\n${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text
      }
    }
    else {
      // Mock enhancement for development
      if (isWorkNode) {
        // Simple work enhancement
        const lines = text.split('\n').filter((line: string) => line.trim())
        enhancedText = lines.map((line: string) => {
          // Add bullet points if not already present
          if (!line.trim().startsWith('•') && !line.trim().startsWith('-')) {
            return `• ${line.trim()}`
          }
          return line
        }).join('\n')
        
        // Add common work phrases based on update type
        if (updateType === 'progress') {
          enhancedText = `Progress Update:\n${enhancedText}`
        } else if (updateType === 'status') {
          enhancedText = `Status:\n${enhancedText}`
        }
      } else {
        // Simple personal enhancement - just clean up
        enhancedText = text
          .split('. ')
          .map((sentence: string) => sentence.trim())
          .filter((s: string) => s.length > 0)
          .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
          .map((s: string) => s.endsWith('.') ? s : s + '.')
          .join(' ')
      }
    }
    
    return NextResponse.json({ enhancedText })
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to enhance update' },
      { status: 500 }
    )
  }
}