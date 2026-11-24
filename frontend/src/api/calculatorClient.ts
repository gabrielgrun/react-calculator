export type BinaryOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'
export type UnaryOperation = 'sqrt' | 'percentage'

export interface CalculatorApi {
  binary(op: BinaryOperation, a: number, b: number): Promise<number>
  unary(op: UnaryOperation, a: number): Promise<number>
}

export class ApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Couldn't reach the server", { cause })
    this.name = 'NetworkError'
  }
}

interface ResultBody {
  result: number
}

interface ErrorBody {
  error: { code: string; message: string }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isResultBody(value: unknown): value is ResultBody {
  return isRecord(value) && typeof value.result === 'number'
}

function isErrorBody(value: unknown): value is ErrorBody {
  return (
    isRecord(value) &&
    isRecord(value.error) &&
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  )
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function unexpectedResponse(status: number): ApiError {
  return new ApiError('unexpected_response', `Unexpected response from the server (HTTP ${status})`)
}

export function createCalculatorApi(
  baseUrl = '/api/v1',
  fetchFn: typeof fetch = fetch,
): CalculatorApi {
  async function post(operation: string, operands: Record<string, number>): Promise<number> {
    let response: Response
    try {
      response = await fetchFn(`${baseUrl}/${operation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operands),
      })
    } catch (cause) {
      throw new NetworkError(cause)
    }

    const body = await readJson(response)
    if (response.ok && isResultBody(body)) {
      return body.result
    }
    if (!response.ok && isErrorBody(body)) {
      throw new ApiError(body.error.code, body.error.message)
    }
    throw unexpectedResponse(response.status)
  }

  return {
    binary: (op, a, b) => post(op, { a, b }),
    unary: (op, a) => post(op, { a }),
  }
}
