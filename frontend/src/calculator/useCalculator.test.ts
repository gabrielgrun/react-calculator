import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiError, type CalculatorApi } from '../api/calculatorClient'
import { createFakeCalculatorApi } from '../test/fakeCalculatorApi'
import { useCalculator } from './useCalculator'

function setup(api: CalculatorApi = createFakeCalculatorApi()) {
  const { result } = renderHook(() => useCalculator(api))
  const type = (...inputs: string[]) =>
    inputs.forEach((text) => act(() => result.current.input(text)))
  const submit = () => act(() => result.current.submit())
  return { result, type, submit }
}

function pendingApi() {
  const resolvers: Array<(value: number) => void> = []
  let calls = 0
  const api: CalculatorApi = {
    binary: () => {
      calls += 1
      return new Promise((resolve) => resolvers.push(resolve))
    },
    unary: () => Promise.reject(new Error('unused')),
  }
  return { api, resolvers, callCount: () => calls }
}

describe('useCalculator', () => {
  it('evaluates the typed expression and keeps it visible', async () => {
    const { result, type, submit } = setup()

    type('2', '+', '3')
    await submit()

    expect(result.current.expression).toBe('2+3')
    expect(result.current.display).toEqual({ kind: 'result', value: '5' })
  })

  it('starts a new expression when a digit is typed after a result', async () => {
    const { result, type, submit } = setup()
    type('2+3')
    await submit()

    type('7')

    expect(result.current.expression).toBe('7')
    expect(result.current.display).toEqual({ kind: 'idle' })
  })

  it('continues from the result when an operator is typed after it', async () => {
    const { result, type, submit } = setup()
    type('2+3')
    await submit()

    type('*')

    expect(result.current.expression).toBe('5*')
  })

  it('continues from a result shown in exponent form', async () => {
    const { result, type, submit } = setup()
    type('1e25*1')
    await submit()
    expect(result.current.display).toEqual({ kind: 'result', value: '1e+25' })

    type('*', '2')
    await submit()

    expect(result.current.display).toEqual({ kind: 'result', value: '2e+25' })
  })

  it('shows syntax errors without calling the API', async () => {
    const api = createFakeCalculatorApi()
    const { result, type, submit } = setup(api)

    type('(1+2')
    await submit()

    expect(result.current.display).toEqual({ kind: 'error', message: 'Missing closing ")"' })
    expect(api.calls).toEqual([])
  })

  it('shows API errors as friendly messages', async () => {
    const failing: CalculatorApi = {
      binary: () => Promise.reject(new ApiError('division_by_zero', 'division by zero')),
      unary: () => Promise.reject(new Error('unused')),
    }
    const { result, type, submit } = setup(failing)

    type('1/0')
    await submit()

    expect(result.current.display).toEqual({ kind: 'error', message: 'Cannot divide by zero' })
  })

  it('clears the error and keeps editing when typing after an error', async () => {
    const { result, type, submit } = setup()
    type('(1+2')
    await submit()

    type(')')

    expect(result.current.expression).toBe('(1+2)')
    expect(result.current.display).toEqual({ kind: 'idle' })
  })

  it('shows loading and ignores input and repeated submits while a request is in flight', async () => {
    const { api, resolvers, callCount } = pendingApi()
    const { result, type } = setup(api)
    type('2+3')

    let firstSubmit: Promise<void> = Promise.resolve()
    act(() => {
      firstSubmit = result.current.submit()
    })
    act(() => {
      void result.current.submit()
    })
    type('9')
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))

    expect(result.current.display).toEqual({ kind: 'loading' })
    expect(result.current.expression).toBe('2+3')
    expect(callCount()).toBe(1)

    await act(async () => {
      resolvers.forEach((resolve) => resolve(5))
      await firstSubmit
    })
    expect(result.current.display).toEqual({ kind: 'result', value: '5' })
  })

  it('ignores input that would exceed the maximum length', () => {
    const { result, type } = setup()

    type('1'.repeat(250))
    expect(result.current.expression).toBe('')

    type('1'.repeat(200), '+')
    expect(result.current.expression).toBe('1'.repeat(200))
  })

  it('removes the last character on backspace', () => {
    const { result, type } = setup()
    type('12+')

    act(() => result.current.backspace())

    expect(result.current.expression).toBe('12')
  })

  it('clears the expression and the display', async () => {
    const { result, type, submit } = setup()
    type('2+3')
    await submit()

    act(() => result.current.clear())

    expect(result.current.expression).toBe('')
    expect(result.current.display).toEqual({ kind: 'idle' })
  })
})
