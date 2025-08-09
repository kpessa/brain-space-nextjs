import { z } from 'zod'

// Email validation with proper format
const EmailSchema = z.string().email().toLowerCase().trim()

// Password validation with security requirements
const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Sign up request schema
export const SignUpRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  displayName: z.string().min(1).max(100).optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
})

// Sign in request schema
export const SignInRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
  rememberMe: z.boolean().optional()
})

// Session request schema
export const SessionRequestSchema = z.object({
  token: z.string().min(1),
  _csrf: z.string().optional() // CSRF token
})

// User profile schema
export const UserProfileSchema = z.object({
  id: z.string(),
  email: EmailSchema,
  displayName: z.string().max(100).optional(),
  photoURL: z.string().url().optional(),
  emailVerified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  settings: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    notifications: z.boolean().default(true),
    emailNotifications: z.boolean().default(false),
    timezone: z.string().default('UTC'),
    language: z.string().default('en')
  }).optional()
})

// Update profile request schema
export const UpdateProfileRequestSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  photoURL: z.string().url().optional(),
  settings: z.object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    notifications: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    timezone: z.string().optional(),
    language: z.string().optional()
  }).optional()
})

// Password reset request schema
export const PasswordResetRequestSchema = z.object({
  email: EmailSchema
})

// Password update request schema
export const PasswordUpdateRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: PasswordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// OAuth provider schema
export const OAuthProviderSchema = z.enum(['google', 'github', 'twitter'])

// Auth response schema
export const AuthResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    uid: z.string(),
    email: z.string().email(),
    displayName: z.string().nullable().optional()
  }).optional(),
  token: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional()
})

// Export types
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>
export type SignInRequest = z.infer<typeof SignInRequestSchema>
export type SessionRequest = z.infer<typeof SessionRequestSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>
export type PasswordUpdateRequest = z.infer<typeof PasswordUpdateRequestSchema>
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>