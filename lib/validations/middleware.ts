import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError, ZodIssue } from 'zod'

/**
 * Format Zod validation errors for API responses
 */
export function formatZodError(error: ZodError): object {
  const formatted = error.issues.map((err: ZodIssue) => ({
    path: err.path.join('.'),
    message: err.message,
    type: err.code
  }))
  
  return {
    error: 'Validation failed',
    details: formatted,
    issues: error.issues
  }
}

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T | null; error: NextResponse | null }> {
  try {
    const body = await request.json()
    const validated = schema.parse(body)
    return { data: validated, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(formatZodError(error), { status: 400 })
      }
    }
    
    // JSON parsing error or other errors
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { data: T | null; error: NextResponse | null } {
  try {
    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    
    // Convert array parameters (e.g., tags[]=a&tags[]=b)
    const processed: Record<string, any> = {}
    for (const [key, value] of Object.entries(query)) {
      if (key.endsWith('[]')) {
        const arrayKey = key.slice(0, -2)
        if (!processed[arrayKey]) {
          processed[arrayKey] = []
        }
        processed[arrayKey].push(value)
      } else {
        processed[key] = value
      }
    }
    
    const validated = schema.parse(processed)
    return { data: validated, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(formatZodError(error), { status: 400 })
      }
    }
    
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      )
    }
  }
}

/**
 * Higher-order function to wrap API handlers with validation
 */
export function withValidation<TBody = unknown, TQuery = unknown>(
  bodySchema?: ZodSchema<TBody>,
  querySchema?: ZodSchema<TQuery>
) {
  return function (
    handler: (
      request: NextRequest,
      context: {
        body?: TBody
        query?: TQuery
        params?: Record<string, string>
      }
    ) => Promise<NextResponse>
  ) {
    return async function (
      request: NextRequest,
      context?: { params?: Record<string, string> }
    ): Promise<NextResponse> {
      const validationContext: {
        body?: TBody
        query?: TQuery
        params?: Record<string, string>
      } = { params: context?.params }
      
      // Validate body if schema provided
      if (bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const { data, error } = await validateBody(request, bodySchema)
        if (error) return error
        validationContext.body = data || undefined
      }
      
      // Validate query if schema provided
      if (querySchema) {
        const { data, error } = validateQuery(request, querySchema)
        if (error) return error
        validationContext.query = data || undefined
      }
      
      // Call the handler with validated data
      return handler(request, validationContext)
    }
  }
}

/**
 * Validate response data against a schema (for internal consistency)
 */
export function validateResponse<T>(
  data: unknown,
  schema: ZodSchema<T>
): { data: T | null; error: Error | null } {
  try {
    const validated = schema.parse(data)
    return { data: validated, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Response validation failed:', formatZodError(error))
      }
      return {
        data: null,
        error: new Error('Response validation failed')
      }
    }
    
    return {
      data: null,
      error: error as Error
    }
  }
}

/**
 * Safe parse with default value
 */
export function safeParse<T>(
  data: unknown,
  schema: ZodSchema<T>,
  defaultValue: T
): T {
  try {
    return schema.parse(data)
  } catch {
    return defaultValue
  }
}