import { useEffect, useEffectEvent } from 'react'
import { useCalculator } from '../calculator/useCalculator'
import { type CalculatorApi, DisplayKind } from '../types'
import { Display } from './Display'
import { Keypad } from './Keypad'
import { type KeyAction, KeyActionType, keyboardAction } from './keys'
import './Calculator.css'

interface CalculatorProps {
  api: CalculatorApi
}

export function Calculator({ api }: CalculatorProps) {
  const calculator = useCalculator(api)

  function perform(action: KeyAction): void {
    switch (action.type) {
      case KeyActionType.Input:
        calculator.input(action.text)
        return
      case KeyActionType.Backspace:
        calculator.backspace()
        return
      case KeyActionType.Clear:
        calculator.clear()
        return
      case KeyActionType.Submit:
        void calculator.submit()
        return
    }
  }

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const action = keyboardAction(event)
    if (action === undefined) {
      return
    }
    event.preventDefault()
    perform(action)
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <section className="calculator" aria-label="Calculator">
      <Display expression={calculator.expression} display={calculator.display} />
      <Keypad onKey={perform} busy={calculator.display.kind === DisplayKind.Loading} />
    </section>
  )
}
