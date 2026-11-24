import { BinaryOperation, type Expr, ExprKind, UnaryOperator } from '../types'
import { ExpressionSyntaxError } from './errors'
import {
  type CloseBracket,
  type OpenBracket,
  Operator,
  type Token,
  TokenType,
  tokenize,
} from './tokenizer'

export const MAX_EXPRESSION_LENGTH = 200

const MATCHING_BRACKET: Record<OpenBracket, CloseBracket> = { '(': ')', '[': ']', '{': '}' }

const ADDITIVE: Partial<Record<Operator, BinaryOperation>> = {
  [Operator.Plus]: BinaryOperation.Add,
  [Operator.Minus]: BinaryOperation.Subtract,
}
const MULTIPLICATIVE: Partial<Record<Operator, BinaryOperation>> = {
  [Operator.Times]: BinaryOperation.Multiply,
  [Operator.Divide]: BinaryOperation.Divide,
}

function describeToken(token: Token): string {
  switch (token.type) {
    case TokenType.Number:
      return 'number'
    case TokenType.Operator:
      return `"${token.value}"`
    case TokenType.Sqrt:
      return '"√"'
    case TokenType.Open:
    case TokenType.Close:
      return `"${token.bracket}"`
  }
}

function unexpected(token: Token | undefined, endPosition: number): ExpressionSyntaxError {
  if (token === undefined) {
    return new ExpressionSyntaxError('Unexpected end of expression', endPosition)
  }
  return new ExpressionSyntaxError(`Unexpected ${describeToken(token)}`, token.position)
}

function isOperator(token: Token | undefined, value: Operator): boolean {
  return token?.type === TokenType.Operator && token.value === value
}

export function parse(input: string): Expr {
  if (input.length > MAX_EXPRESSION_LENGTH) {
    throw new ExpressionSyntaxError(
      `Expression is too long (max ${MAX_EXPRESSION_LENGTH} characters)`,
      MAX_EXPRESSION_LENGTH,
    )
  }

  const tokens = tokenize(input)
  if (tokens.length === 0) {
    throw new ExpressionSyntaxError('Enter an expression', 0)
  }

  let index = 0
  const peek = (): Token | undefined => tokens[index]
  const next = (): Token | undefined => tokens[index++]

  function binaryOperationOf(
    table: Partial<Record<Operator, BinaryOperation>>,
  ): BinaryOperation | undefined {
    const token = peek()
    return token?.type === TokenType.Operator ? table[token.value] : undefined
  }

  function parseExpression(): Expr {
    let left = parseTerm()
    let op = binaryOperationOf(ADDITIVE)
    while (op !== undefined) {
      next()
      left = { kind: ExprKind.Binary, op, left, right: parseTerm() }
      op = binaryOperationOf(ADDITIVE)
    }
    return left
  }

  function parseTerm(): Expr {
    let left = parseUnary()
    let op = binaryOperationOf(MULTIPLICATIVE)
    while (op !== undefined) {
      next()
      left = { kind: ExprKind.Binary, op, left, right: parseUnary() }
      op = binaryOperationOf(MULTIPLICATIVE)
    }
    return left
  }

  function parseUnary(): Expr {
    if (isOperator(peek(), Operator.Minus)) {
      next()
      return { kind: ExprKind.Unary, op: UnaryOperator.Negate, operand: parseUnary() }
    }
    return parsePower()
  }

  function parsePower(): Expr {
    const base = parsePostfix()
    if (!isOperator(peek(), Operator.Power)) {
      return base
    }
    next()
    return { kind: ExprKind.Binary, op: BinaryOperation.Power, left: base, right: parseUnary() }
  }

  function parsePostfix(): Expr {
    let operand = parsePrimary()
    while (isOperator(peek(), Operator.Percent)) {
      next()
      operand = { kind: ExprKind.Unary, op: UnaryOperator.Percentage, operand }
    }
    return operand
  }

  function parsePrimary(): Expr {
    const token = next()
    if (token?.type === TokenType.Number) {
      return { kind: ExprKind.Number, value: token.value }
    }
    if (token?.type === TokenType.Sqrt) {
      return { kind: ExprKind.Unary, op: UnaryOperator.Sqrt, operand: parsePrimary() }
    }
    if (token?.type === TokenType.Open) {
      const inner = parseExpression()
      expectClosing(token.bracket)
      return inner
    }
    throw unexpected(token, input.length)
  }

  function expectClosing(open: OpenBracket): void {
    const expected = MATCHING_BRACKET[open]
    const token = next()
    if (token === undefined) {
      throw new ExpressionSyntaxError(`Missing closing "${expected}"`, input.length)
    }
    if (token.type !== TokenType.Close) {
      throw unexpected(token, input.length)
    }
    if (token.bracket !== expected) {
      throw new ExpressionSyntaxError(
        `Expected "${expected}" but found "${token.bracket}"`,
        token.position,
      )
    }
  }

  const expression = parseExpression()
  const leftover = peek()
  if (leftover !== undefined) {
    throw unexpected(leftover, input.length)
  }
  return expression
}
