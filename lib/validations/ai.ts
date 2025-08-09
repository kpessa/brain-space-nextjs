import { z } from 'zod'
import { NodeTypeSchema } from './node'

// AI Provider schema
export const AIProviderSchema = z.enum(['openai', 'google', 'gemini', 'anthropic', 'mock'])

// Categorize request schema
export const CategorizeRequestSchema = z.object({
  text: z.string().min(1).max(10000),
  provider: AIProviderSchema.optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(10).max(4000).optional()
})

// Categorize response schema
export const CategorizeResponseSchema = z.object({
  categories: z.array(z.object({
    name: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().optional()
  })),
  nodeData: z.object({
    type: NodeTypeSchema,
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    urgency: z.number().min(0).max(10).optional(),
    importance: z.number().min(0).max(10).optional()
  }),
  suggestions: z.array(z.string()).optional(),
  provider: AIProviderSchema
})

// Enhance node request schema
export const EnhanceNodeRequestSchema = z.object({
  nodeId: z.string(),
  nodeTitle: z.string(),
  nodeDescription: z.string().optional(),
  nodeType: NodeTypeSchema,
  action: z.enum(['expand', 'summarize', 'actionItems', 'questions']),
  provider: AIProviderSchema.optional()
})

// Enhance node response schema
export const EnhanceNodeResponseSchema = z.object({
  enhanced: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    actionItems: z.array(z.string()).optional(),
    questions: z.array(z.string()).optional(),
    summary: z.string().optional()
  }),
  suggestions: z.array(z.string()).optional(),
  provider: AIProviderSchema
})

// Suggest recurrence request schema
export const SuggestRecurrenceRequestSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  type: NodeTypeSchema,
  provider: AIProviderSchema.optional()
})

// Suggest recurrence response schema
export const SuggestRecurrenceResponseSchema = z.object({
  suggested: z.boolean(),
  pattern: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']).optional(),
  interval: z.number().min(1).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  provider: AIProviderSchema
})

// Timebox recommendations request schema
export const TimeboxRecommendationsRequestSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: NodeTypeSchema,
    urgency: z.number().min(0).max(10).optional(),
    importance: z.number().min(0).max(10).optional(),
    estimatedDuration: z.number().min(0).optional()
  })),
  availableTime: z.number().min(0),
  preferences: z.object({
    focusTime: z.array(z.string()).optional(),
    breakDuration: z.number().min(0).optional(),
    maxConsecutiveTasks: z.number().min(1).optional()
  }).optional(),
  provider: AIProviderSchema.optional()
})

// Timebox recommendations response schema
export const TimeboxRecommendationsResponseSchema = z.object({
  recommendations: z.array(z.object({
    nodeId: z.string(),
    startTime: z.string(),
    duration: z.number(),
    reason: z.string(),
    priority: z.number().min(0).max(10)
  })),
  summary: z.string(),
  totalTime: z.number(),
  provider: AIProviderSchema
})

// Export types
export type AIProvider = z.infer<typeof AIProviderSchema>
export type CategorizeRequest = z.infer<typeof CategorizeRequestSchema>
export type CategorizeResponse = z.infer<typeof CategorizeResponseSchema>
export type EnhanceNodeRequest = z.infer<typeof EnhanceNodeRequestSchema>
export type EnhanceNodeResponse = z.infer<typeof EnhanceNodeResponseSchema>
export type SuggestRecurrenceRequest = z.infer<typeof SuggestRecurrenceRequestSchema>
export type SuggestRecurrenceResponse = z.infer<typeof SuggestRecurrenceResponseSchema>
export type TimeboxRecommendationsRequest = z.infer<typeof TimeboxRecommendationsRequestSchema>
export type TimeboxRecommendationsResponse = z.infer<typeof TimeboxRecommendationsResponseSchema>