import type { BinaryOperation } from '../api/calculatorClient'

export type UnaryOperator = 'negate' | 'sqrt' | 'percentage'

export type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'binary'; op: BinaryOperation; left: Expr; right: Expr }
  | { kind: 'unary'; op: UnaryOperator; operand: Expr }
