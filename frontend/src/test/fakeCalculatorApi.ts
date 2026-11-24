import type { BinaryOperation, CalculatorApi, UnaryOperation } from '../api/calculatorClient'

export type RecordedCall =
  { op: BinaryOperation; a: number; b: number } | { op: UnaryOperation; a: number }

const BINARY: Record<BinaryOperation, (a: number, b: number) => number> = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => a / b,
  power: (a, b) => a ** b,
}

const UNARY: Record<UnaryOperation, (a: number) => number> = {
  sqrt: (a) => Math.sqrt(a),
  percentage: (a) => a / 100,
}

export function createFakeCalculatorApi(): CalculatorApi & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = []
  return {
    calls,
    binary: async (op, a, b) => {
      calls.push({ op, a, b })
      return BINARY[op](a, b)
    },
    unary: async (op, a) => {
      calls.push({ op, a })
      return UNARY[op](a)
    },
  }
}
