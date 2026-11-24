import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/calculatorClient'
import { createFakeCalculatorApi } from '../test/fakeCalculatorApi'
import type { CalculatorApi } from '../types'
import { Calculator } from './Calculator'

function renderCalculator(api: CalculatorApi = createFakeCalculatorApi()) {
  render(<Calculator api={api} />)
  return {
    user: userEvent.setup(),
    status: () => screen.getByRole('status'),
    expression: () => screen.getByLabelText('Expression'),
  }
}

describe('Calculator', () => {
  it('computes an expression entered with the keypad', async () => {
    const { user, status, expression } = renderCalculator()

    for (const name of ['2', 'add', '3', 'multiply', '4']) {
      await user.click(screen.getByRole('button', { name }))
    }
    expect(expression()).toHaveTextContent('2+3×4')

    await user.click(screen.getByRole('button', { name: 'equals' }))

    expect(await screen.findByText('14')).toBeInTheDocument()
    expect(status()).toHaveTextContent('14')
  })

  it('accepts the physical keyboard, including brackets', async () => {
    const { user, status, expression } = renderCalculator()

    await user.keyboard('2*[[3+(4-1)]{Enter}')

    expect(expression()).toHaveTextContent('2×[3+(4−1)]')
    expect(await screen.findByText('12')).toBeInTheDocument()
    expect(status()).toHaveTextContent('12')
  })

  it('supports backspace, escape and the square-root shortcut', async () => {
    const { user, expression } = renderCalculator()

    await user.keyboard('12{Backspace}')
    expect(expression()).toHaveTextContent('1')

    await user.keyboard('{Escape}r9')
    expect(expression()).toHaveTextContent('√9')
  })

  it('lets Enter press the focused keypad button', async () => {
    const { user, expression } = renderCalculator()

    screen.getByRole('button', { name: '7' }).focus()
    await user.keyboard('{Enter}')

    expect(expression()).toHaveTextContent('7')
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('ignores keys pressed with a modifier', async () => {
    const { user, expression } = renderCalculator()

    await user.keyboard('{Control>}r{/Control}')

    expect(expression()).toHaveTextContent('')
  })

  it('shows API errors as friendly messages', async () => {
    const failing: CalculatorApi = {
      binary: () => Promise.reject(new ApiError('division_by_zero', 'division by zero')),
      unary: () => Promise.reject(new Error('unused')),
    }
    const { user, status } = renderCalculator(failing)

    await user.keyboard('1/0{Enter}')

    expect(await screen.findByText('Cannot divide by zero')).toBeInTheDocument()
    expect(status()).toHaveTextContent('Cannot divide by zero')
  })

  it('marks the equals key busy while waiting for the API', async () => {
    let finish: (value: number) => void = () => {}
    const slow: CalculatorApi = {
      binary: () => new Promise((resolve) => (finish = resolve)),
      unary: () => Promise.reject(new Error('unused')),
    }
    const { user } = renderCalculator(slow)

    await user.keyboard('1+1{Enter}')

    expect(screen.getByRole('button', { name: 'equals' })).toHaveAttribute('aria-busy', 'true')
    await act(async () => finish(2))
    expect(screen.getByRole('button', { name: 'equals' })).not.toBeDisabled()
  })
})
