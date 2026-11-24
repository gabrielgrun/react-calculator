import { useRef, useState } from 'react'
import type { CalculatorApi } from '../api/calculatorClient'
import type { Expr } from '../expression/ast'
import { evaluate } from '../expression/evaluator'
import { MAX_EXPRESSION_LENGTH, parse } from '../expression/parser'
import { errorMessage, formatResult } from './format'

export type DisplayState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; value: string }
  | { kind: 'error'; message: string }

interface CalculatorState {
  expression: string
  display: DisplayState
}

const IDLE: DisplayState = { kind: 'idle' }
const STARTS_WITH_OPERATOR = /^[+\-*/^%×÷−]/

function editableText(state: CalculatorState, text: string): string {
  if (state.display.kind !== 'result') {
    return state.expression
  }
  return STARTS_WITH_OPERATOR.test(text) ? state.display.value : ''
}

function appendInput(state: CalculatorState, text: string): CalculatorState {
  const expression = editableText(state, text) + text
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return state
  }
  return { expression, display: IDLE }
}

export function useCalculator(api: CalculatorApi) {
  const [state, setState] = useState<CalculatorState>({ expression: '', display: IDLE })
  const inFlight = useRef(false)

  function input(text: string): void {
    if (inFlight.current) {
      return
    }
    setState((current) => appendInput(current, text))
  }

  function backspace(): void {
    if (inFlight.current) {
      return
    }
    setState((current) => ({ expression: current.expression.slice(0, -1), display: IDLE }))
  }

  function clear(): void {
    if (inFlight.current) {
      return
    }
    setState({ expression: '', display: IDLE })
  }

  async function submit(): Promise<void> {
    if (inFlight.current) {
      return
    }
    const { expression } = state
    const showError = (error: unknown) =>
      setState({ expression, display: { kind: 'error', message: errorMessage(error) } })

    let tree: Expr
    try {
      tree = parse(expression)
    } catch (error) {
      showError(error)
      return
    }

    inFlight.current = true
    setState({ expression, display: { kind: 'loading' } })
    try {
      const value = await evaluate(tree, api)
      setState({ expression, display: { kind: 'result', value: formatResult(value) } })
    } catch (error) {
      showError(error)
    } finally {
      inFlight.current = false
    }
  }

  return { expression: state.expression, display: state.display, input, backspace, clear, submit }
}
