import { z } from 'zod'

// Enum schemas
export const NodeTypeSchema = z.enum([
  'thought',
  'idea',
  'task',
  'project',
  'goal',
  'note',
  'reminder',
  'event',
  'meeting',
  'decision',
  'question',
  'learning',
  'habit',
  'milestone'
])

export const TaskTypeSchema = z.enum([
  'recurring',
  'one-time'
])

export const RecurrencePatternSchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'custom'
])

// Update type schema
export const NodeUpdateSchema = z.object({
  id: z.string(),
  content: z.string(),
  timestamp: z.string().datetime(),
  userId: z.string(),
  userName: z.string().optional(),
  type: z.enum(['note', 'progress', 'blocker', 'decision']).default('note'),
  isPinned: z.boolean().default(false)
})

// Recurrence schema
export const RecurrenceSchema = z.object({
  pattern: RecurrencePatternSchema,
  interval: z.number().min(1).default(1),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  endDate: z.string().datetime().optional(),
  maxOccurrences: z.number().min(1).optional()
})

// Recurring completion schema
export const RecurringCompletionSchema = z.object({
  date: z.string(),
  completedAt: z.string().datetime(),
  status: z.enum(['completed', 'skipped', 'partial']),
  notes: z.string().optional()
})

// Main Node schema
export const NodeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: NodeTypeSchema,
  tags: z.array(z.string().max(50)).default(['misc']),
  urgency: z.number().min(0).max(10).optional(),
  importance: z.number().min(0).max(10).optional(),
  completed: z.boolean().default(false),
  dueDate: z.string().datetime().optional(),
  parent: z.string().nullable().optional(),
  children: z.array(z.string()).optional(),
  updates: z.array(NodeUpdateSchema).optional(),
  isPinned: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  
  // Recurring task fields
  taskType: TaskTypeSchema.optional(),
  recurrence: RecurrenceSchema.optional(),
  recurringCompletions: z.array(RecurringCompletionSchema).optional(),
  currentStreak: z.number().min(0).optional(),
  longestStreak: z.number().min(0).optional(),
  lastRecurringCompletionDate: z.string().optional()
})

// Schema for creating a new node
export const CreateNodeSchema = NodeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).partial({
  userId: true, // Will be set from auth context
  completed: true,
  isPinned: true
})

// Schema for updating a node
export const UpdateNodeSchema = NodeSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true
})

// Schema for node filters
export const NodeFiltersSchema = z.object({
  type: NodeTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  completed: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  hasParent: z.boolean().optional(),
  urgencyMin: z.number().min(0).max(10).optional(),
  urgencyMax: z.number().min(0).max(10).optional(),
  importanceMin: z.number().min(0).max(10).optional(),
  importanceMax: z.number().min(0).max(10).optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  searchQuery: z.string().max(200).optional()
})

// Export types
export type NodeType = z.infer<typeof NodeTypeSchema>
export type TaskType = z.infer<typeof TaskTypeSchema>
export type RecurrencePattern = z.infer<typeof RecurrencePatternSchema>
export type NodeUpdate = z.infer<typeof NodeUpdateSchema>
export type Recurrence = z.infer<typeof RecurrenceSchema>
export type RecurringCompletion = z.infer<typeof RecurringCompletionSchema>
export type Node = z.infer<typeof NodeSchema>
export type CreateNode = z.infer<typeof CreateNodeSchema>
export type UpdateNode = z.infer<typeof UpdateNodeSchema>
export type NodeFilters = z.infer<typeof NodeFiltersSchema>