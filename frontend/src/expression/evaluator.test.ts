import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/calculatorClient'
import type { CalculatorApi } from '../types'
import { createFakeCalculatorApi } from '../test/fakeCalculatorApi'
import { evaluate } from './evaluator'
import { parse } from './parser'

describe('evaluate', () => {
  it('resolves the tree bottom-up, one API call per operation', async () => {
    const api = createFakeCalculatorApi()

    await expect(evaluate(parse('2*[3+(4-1)]'), api)).resolves.toBe(12)

    expect(api.calls).toEqual([
      { op: 'subtract', a: 4, b: 1 },
      { op: 'add', a: 3, b: 3 },
      { op: 'multiply', a: 2, b: 6 },
    ])
  })

  it('returns a lone number without calling the API', async () => {
    const api = createFakeCalculatorApi()

    await expect(evaluate(parse('42'), api)).resolves.toBe(42)

    expect(api.calls).toEqual([])
  })

  it('negates by subtracting from zero', async () => {
    const api = createFakeCalculatorApi()

    await expect(evaluate(parse('-5'), api)).resolves.toBe(-5)

    expect(api.calls).toEqual([{ op: 'subtract', a: 0, b: 5 }])
  })

  it('calls the unary endpoints for square root and percentage', async () => {
    const api = createFakeCalculatorApi()

    await evaluate(parse('√9'), api)
    await evaluate(parse('50%'), api)

    expect(api.calls).toEqual([
      { op: 'sqrt', a: 9 },
      { op: 'percentage', a: 50 },
    ])
  })

  it('evaluates independent branches in parallel', async () => {
    const started: string[] = []
    const pending: Array<() => void> = []
    const api: CalculatorApi = {
      binary: (op, a, b) => {
        started.push(`${op}(${a},${b})`)
        if (op !== 'add') {
          return Promise.resolve(a * b)
        }
        return new Promise((resolve) => pending.push(() => resolve(a + b)))
      },
      unary: () => Promise.reject(new Error('unused')),
    }

    const result = evaluate(parse('(1+2)*(3+4)'), api)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(started).toEqual(['add(1,2)', 'add(3,4)'])
    pending.forEach((resolve) => resolve())
    await expect(result).resolves.toBe(21)
  })

  it('propagates API errors unchanged', async () => {
    const failure = new ApiError('division_by_zero', 'division by zero')
    const api: CalculatorApi = {
      binary: () => Promise.reject(failure),
      unary: () => Promise.reject(failure),
    }

    await expect(evaluate(parse('1/0'), api)).rejects.toBe(failure)
  })
})
