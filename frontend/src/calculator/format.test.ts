import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from '../api/calculatorClient'
import { ExpressionSyntaxError } from '../expression/errors'
import { errorMessage, formatResult } from './format'

describe('formatResult', () => {
  it.each([
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.333333333333333'],
    [123456789012345, '123456789012345'],
    [1e25, '1e+25'],
    [-0, '0'],
    [12, '12'],
    [-2.5, '-2.5'],
  ])('formats %d as %s', (value, expected) => {
    expect(formatResult(value)).toBe(expected)
  })
})

describe('errorMessage', () => {
  it.each([
    ['division_by_zero', 'Cannot divide by zero'],
    ['negative_sqrt', 'Cannot take the square root of a negative number'],
    ['undefined_result', 'Result is undefined'],
    ['overflow', 'Result is too large'],
  ])('maps the API code %s to a friendly message', (code, message) => {
    expect(errorMessage(new ApiError(code, 'raw server message'))).toBe(message)
  })

  it('falls back to the server message for unknown API codes', () => {
    expect(errorMessage(new ApiError('something_new', 'Something new happened'))).toBe(
      'Something new happened',
    )
  })

  it('explains network failures', () => {
    expect(errorMessage(new NetworkError(new TypeError('Failed to fetch')))).toBe(
      "Couldn't reach the server",
    )
  })

  it('shows syntax errors as they are', () => {
    expect(errorMessage(new ExpressionSyntaxError('Missing closing ")"', 4))).toBe(
      'Missing closing ")"',
    )
  })

  it('uses a generic message for anything else', () => {
    expect(errorMessage('boom')).toBe('Something went wrong')
  })
})
