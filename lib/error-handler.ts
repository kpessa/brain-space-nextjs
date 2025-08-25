import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { formatZodError } from './validations/middleware'

/**
 * Custom error classes for better error handling
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
    this.name = 'RateLimitError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: unknown) {
    super(
      `External service error: ${service}`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      originalError
    )
    this.name = 'ExternalServiceError'
  }
}

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse {
  // Log error for debugging

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(formatZodError(error), { status: 400 })
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    )
  }

  // Handle Firebase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as {
      code?: string
      message?: string
    }
    
    // Map Firebase error codes to HTTP status codes
    const firebaseErrorMap: Record<string, number> = {
      'auth/invalid-credential': 401,
      'auth/user-not-found': 404,
      'auth/wrong-password': 401,
      'auth/email-already-in-use': 409,
      'auth/weak-password': 400,
      'auth/invalid-email': 400,
      'auth/operation-not-allowed': 403,
      'auth/account-exists-with-different-credential': 409,
      'permission-denied': 403,
      'not-found': 404,
      'already-exists': 409,
      'resource-exhausted': 429,
      'unavailable': 503,
    }
    
    const statusCode = firebaseErrorMap[firebaseError.code] || 500
    
    return NextResponse.json(
      {
        error: firebaseError.message || 'Firebase error',
        code: firebaseError.code,
      },
      { status: statusCode }
    )
  }

  // Handle standard errors
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }

  // Handle unknown errors
  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  )
}

/**
 * Async wrapper for API route handlers with error handling
 */
export function withErrorHandler<T extends unknown[], R>(
  handler: (...args: T) => Promise<NextResponse | R>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(...args)
      
      // If the handler returns a NextResponse, return it as-is
      if (result instanceof NextResponse) {
        return result
      }
      
      // Otherwise, wrap the result in a NextResponse
      return NextResponse.json(result)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Rate limiting utility
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): void {
  const now = Date.now()
  const record = requestCounts.get(identifier)
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return
  }
  
  if (record.count >= maxRequests) {
    throw new RateLimitError(`Rate limit exceeded. Please try again later.`)
  }
  
  record.count++
}