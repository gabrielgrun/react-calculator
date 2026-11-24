import { BinaryOperation, type CalculatorApi, UnaryOperation } from '@/types'

export type RecordedCall =
  { op: BinaryOperation; a: number; b: number } | { op: UnaryOperation; a: number }

const BINARY: Record<BinaryOperation, (a: number, b: number) => number> = {
  [BinaryOperation.Add]: (a, b) => a + b,
  [BinaryOperation.Subtract]: (a, b) => a - b,
  [BinaryOperation.Multiply]: (a, b) => a * b,
  [BinaryOperation.Divide]: (a, b) => a / b,
  [BinaryOperation.Power]: (a, b) => a ** b,
}

const UNARY: Record<UnaryOperation, (a: number) => number> = {
  [UnaryOperation.Sqrt]: (a) => Math.sqrt(a),
  [UnaryOperation.Percentage]: (a) => a / 100,
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
