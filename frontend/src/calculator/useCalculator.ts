import { useRef, useState } from 'react'
import { evaluate } from '@/expression/evaluator'
import { MAX_EXPRESSION_LENGTH, TOO_LONG_MESSAGE, parse } from '@/expression/parser'
import { type CalculatorApi, DisplayKind, type DisplayState, type Expr } from '@/types'
import { MINUS_SIGN, errorMessage } from '@/calculator/format'

interface CalculatorState {
  expression: string
  display: DisplayState
}

const IDLE: DisplayState = { kind: DisplayKind.Idle }
const STARTS_WITH_OPERATOR = /^[+\-*/^%×÷−]/

function resultAsOperand(value: number): string {
  return value < 0 ? `(${MINUS_SIGN}${-value})` : String(value)
}

function editableText(state: CalculatorState, text: string): string {
  if (state.display.kind !== DisplayKind.Result) {
    return state.expression
  }
  return STARTS_WITH_OPERATOR.test(text) ? resultAsOperand(state.display.value) : ''
}

function appendInput(state: CalculatorState, text: string): CalculatorState {
  const expression = editableText(state, text) + text
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return { ...state, display: { kind: DisplayKind.Error, message: TOO_LONG_MESSAGE } }
  }
  return { expression, display: IDLE }
}

export function useCalculator(api: CalculatorApi) {
  const [state, setState] = useState<CalculatorState>({ expression: '', display: IDLE })
  const inFlight = useRef(false)

  function unlessBusy(update: () => void): void {
    if (!inFlight.current) {
      update()
    }
  }

  function input(text: string): void {
    unlessBusy(() => setState((current) => appendInput(current, text)))
  }

  function backspace(): void {
    unlessBusy(() =>
      setState((current) => ({ expression: current.expression.slice(0, -1), display: IDLE })),
    )
  }

  function clear(): void {
    unlessBusy(() => setState({ expression: '', display: IDLE }))
  }

  async function submit(): Promise<void> {
    if (inFlight.current) {
      return
    }
    const { expression } = state
    const showError = (error: unknown) =>
      setState({ expression, display: { kind: DisplayKind.Error, message: errorMessage(error) } })

    let tree: Expr
    try {
      tree = parse(expression)
    } catch (error) {
      showError(error)
      return
    }

    inFlight.current = true
    setState({ expression, display: { kind: DisplayKind.Loading } })
    try {
      const value = await evaluate(tree, api)
      setState({ expression, display: { kind: DisplayKind.Result, value } })
    } catch (error) {
      showError(error)
    } finally {
      inFlight.current = false
    }
  }

  return { expression: state.expression, display: state.display, input, backspace, clear, submit }
}
