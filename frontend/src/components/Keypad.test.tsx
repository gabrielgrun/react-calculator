import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Keypad } from '@/components/Keypad'
import { KEYS, type KeyAction, KeyActionType } from '@/components/keys'

describe('Keypad', () => {
  it('gives every key an accessible name', () => {
    render(<Keypad onKey={vi.fn<(action: KeyAction) => void>()} busy={false} />)

    for (const name of [
      'square root',
      'divide',
      'multiply',
      'subtract',
      'add',
      'power',
      'percent',
      'backspace',
      'clear',
      'equals',
      'decimal point',
      'open parenthesis',
      'close parenthesis',
      'open bracket',
      'close bracket',
      '0',
      '9',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button')).toHaveLength(KEYS.length)
  })

  it('reports the action of the clicked key', async () => {
    const onKey = vi.fn<(action: KeyAction) => void>()
    render(<Keypad onKey={onKey} busy={false} />)

    await userEvent.click(screen.getByRole('button', { name: 'square root' }))
    await userEvent.click(screen.getByRole('button', { name: 'equals' }))

    expect(onKey.mock.calls).toEqual([
      [{ type: KeyActionType.Input, text: '√' }],
      [{ type: KeyActionType.Submit }],
    ])
  })

  it('disables the equals key while busy', () => {
    render(<Keypad onKey={vi.fn<(action: KeyAction) => void>()} busy />)

    const equals = screen.getByRole('button', { name: 'equals' })
    expect(equals).toBeDisabled()
    expect(equals).toHaveAttribute('aria-busy', 'true')
  })
})
