export type ValueOf<T> = T[keyof T]

export const BinaryOperation = {
  Add: 'add',
  Subtract: 'subtract',
  Multiply: 'multiply',
  Divide: 'divide',
  Power: 'power',
} as const
export type BinaryOperation = ValueOf<typeof BinaryOperation>

export const UnaryOperation = {
  Sqrt: 'sqrt',
  Percentage: 'percentage',
} as const
export type UnaryOperation = ValueOf<typeof UnaryOperation>

export interface CalculatorApi {
  binary(op: BinaryOperation, a: number, b: number): Promise<number>
  unary(op: UnaryOperation, a: number): Promise<number>
}

export const ExprKind = {
  Number: 'number',
  Binary: 'binary',
  Unary: 'unary',
} as const
export type ExprKind = ValueOf<typeof ExprKind>

export const UnaryOperator = {
  Negate: 'negate',
  Sqrt: 'sqrt',
  Percentage: 'percentage',
} as const
export type UnaryOperator = ValueOf<typeof UnaryOperator>

export type Expr =
  | { kind: typeof ExprKind.Number; value: number }
  | { kind: typeof ExprKind.Binary; op: BinaryOperation; left: Expr; right: Expr }
  | { kind: typeof ExprKind.Unary; op: UnaryOperator; operand: Expr }

export const DisplayKind = {
  Idle: 'idle',
  Loading: 'loading',
  Result: 'result',
  Error: 'error',
} as const
export type DisplayKind = ValueOf<typeof DisplayKind>

export type DisplayState =
  | { kind: typeof DisplayKind.Idle }
  | { kind: typeof DisplayKind.Loading }
  | { kind: typeof DisplayKind.Result; value: number }
  | { kind: typeof DisplayKind.Error; message: string }

export const ApiErrorCode = {
  InvalidJson: 'invalid_json',
  MissingOperand: 'missing_operand',
  PayloadTooLarge: 'payload_too_large',
  NotFound: 'not_found',
  MethodNotAllowed: 'method_not_allowed',
  DivisionByZero: 'division_by_zero',
  NegativeSqrt: 'negative_sqrt',
  UndefinedResult: 'undefined_result',
  Overflow: 'overflow',
  UnexpectedResponse: 'unexpected_response',
} as const
export type ApiErrorCode = ValueOf<typeof ApiErrorCode>
