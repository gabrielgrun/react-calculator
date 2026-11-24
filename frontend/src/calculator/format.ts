import { ApiError, NetworkError } from '../api/calculatorClient'
import { ExpressionSyntaxError } from '../expression/errors'

const SIGNIFICANT_DIGITS = 15

const API_ERROR_MESSAGES: Partial<Record<string, string>> = {
  division_by_zero: 'Cannot divide by zero',
  negative_sqrt: 'Cannot take the square root of a negative number',
  undefined_result: 'Result is undefined',
  overflow: 'Result is too large',
}

export function formatResult(value: number): string {
  return String(Number.parseFloat(value.toPrecision(SIGNIFICANT_DIGITS)))
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
