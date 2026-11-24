import { ApiError, NetworkError } from '../api/calculatorClient'
import { ExpressionSyntaxError } from '../expression/errors'
import { ApiErrorCode } from '../types'

const SIGNIFICANT_DIGITS = 15
const HYPHEN_MINUS = /-/g
const MINUS_SIGN = '−'

const API_ERROR_MESSAGES: Partial<Record<string, string>> = {
  [ApiErrorCode.DivisionByZero]: 'Cannot divide by zero',
  [ApiErrorCode.NegativeSqrt]: 'Cannot take the square root of a negative number',
  [ApiErrorCode.UndefinedResult]: 'Result is undefined',
  [ApiErrorCode.Overflow]: 'Result is too large',
}

export function formatResult(value: number): string {
  const rounded = Number.parseFloat(value.toPrecision(SIGNIFICANT_DIGITS))
  return String(rounded).replace(HYPHEN_MINUS, MINUS_SIGN)
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return API_ERROR_MESSAGES[error.code] ?? error.message
  }
  if (error instanceof NetworkError || error instanceof ExpressionSyntaxError) {
    return error.message
  }
  return 'Something went wrong'
}
