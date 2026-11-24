import { describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError, createCalculatorApi } from './calculatorClient'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fakeFetch(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response)
}

describe('createCalculatorApi', () => {
  it('posts both operands to the binary operation endpoint and returns the result', async () => {
    const fetchFn = fakeFetch(jsonResponse(200, { result: 5 }))
    const api = createCalculatorApi('/api/v1', fetchFn)

    await expect(api.binary('add', 2, 3)).resolves.toBe(5)

    expect(fetchFn).toHaveBeenCalledWith('/api/v1/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 2, b: 3 }),
    })
  })

  it('posts a single operand to the unary operation endpoint', async () => {
    const fetchFn = fakeFetch(jsonResponse(200, { result: 3 }))
    const api = createCalculatorApi('/api/v1', fetchFn)

    await expect(api.unary('sqrt', 9)).resolves.toBe(3)

    expect(fetchFn).toHaveBeenCalledWith(
      '/api/v1/sqrt',
      expect.objectContaining({ body: JSON.stringify({ a: 9 }) }),
    )
  })

  it('rejects with the API error code and message', async () => {
    const api = createCalculatorApi(
      '/api/v1',
      fakeFetch(
        jsonResponse(422, { error: { code: 'division_by_zero', message: 'division by zero' } }),
      ),
    )

    const error = await api.binary('divide', 1, 0).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'division_by_zero', message: 'division by zero' })
  })

  it('rejects with unexpected_response when an error body is not JSON', async () => {
    const api = createCalculatorApi(
      '/api/v1',
      fakeFetch(new Response('Internal error', { status: 500 })),
    )

    await expect(api.binary('add', 1, 2)).rejects.toMatchObject({ code: 'unexpected_response' })
  })

  it('rejects with unexpected_response when a success body has no numeric result', async () => {
    const api = createCalculatorApi('/api/v1', fakeFetch(jsonResponse(200, { value: 1 })))

    const error = await api.binary('add', 1, 2).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'unexpected_response' })
  })

  it('rejects with a NetworkError when the server cannot be reached', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    const api = createCalculatorApi('/api/v1', fetchFn)

    await expect(api.binary('add', 1, 2)).rejects.toBeInstanceOf(NetworkError)
  })

  it('uses /api/v1 as the default base URL', async () => {
    const fetchFn = fakeFetch(jsonResponse(200, { result: 0.5 }))
    const api = createCalculatorApi(undefined, fetchFn)

    await api.unary('percentage', 50)

    expect(fetchFn).toHaveBeenCalledWith('/api/v1/percentage', expect.anything())
  })
})
