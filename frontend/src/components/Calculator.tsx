import { useEffect, useEffectEvent } from 'react'
import { useCalculator } from '@/calculator/useCalculator'
import { type CalculatorApi, DisplayKind } from '@/types'
import { Display } from '@/components/Display'
import { Keypad } from '@/components/Keypad'
import { type KeyAction, KeyActionType, keyboardAction } from '@/components/keys'
import '@/components/Calculator.css'

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
    if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) {
      return
    }
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
