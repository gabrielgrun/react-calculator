import type { BinaryOperation } from '../api/calculatorClient'
import type { Expr } from './ast'
import { ExpressionSyntaxError } from './errors'
import { type CloseBracket, type OpenBracket, type Token, tokenize } from './tokenizer'

export const MAX_EXPRESSION_LENGTH = 200

const MATCHING_BRACKET: Record<OpenBracket, CloseBracket> = { '(': ')', '[': ']', '{': '}' }

const ADDITIVE: Partial<Record<string, BinaryOperation>> = { '+': 'add', '-': 'subtract' }
const MULTIPLICATIVE: Partial<Record<string, BinaryOperation>> = { '*': 'multiply', '/': 'divide' }

function describeToken(token: Token): string {
  switch (token.type) {
    case 'number':
      return 'number'
    case 'operator':
      return `"${token.value}"`
    case 'sqrt':
      return '"√"'
    case 'open':
    case 'close':
      return `"${token.bracket}"`
  }
}

function unexpected(token: Token | undefined, endPosition: number): ExpressionSyntaxError {
  if (token === undefined) {
    return new ExpressionSyntaxError('Unexpected end of expression', endPosition)
  }
  return new ExpressionSyntaxError(`Unexpected ${describeToken(token)}`, token.position)
}

function isOperator(token: Token | undefined, value: string): boolean {
  return token?.type === 'operator' && token.value === value
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
    table: Partial<Record<string, BinaryOperation>>,
  ): BinaryOperation | undefined {
    const token = peek()
    return token?.type === 'operator' ? table[token.value] : undefined
  }

  function parseExpression(): Expr {
    let left = parseTerm()
    let op = binaryOperationOf(ADDITIVE)
    while (op !== undefined) {
      next()
      left = { kind: 'binary', op, left, right: parseTerm() }
      op = binaryOperationOf(ADDITIVE)
    }
    return left
  }

  function parseTerm(): Expr {
    let left = parseUnary()
    let op = binaryOperationOf(MULTIPLICATIVE)
    while (op !== undefined) {
      next()
      left = { kind: 'binary', op, left, right: parseUnary() }
      op = binaryOperationOf(MULTIPLICATIVE)
    }
    return left
  }

  function parseUnary(): Expr {
    if (isOperator(peek(), '-')) {
      next()
      return { kind: 'unary', op: 'negate', operand: parseUnary() }
    }
    return parsePower()
  }

  function parsePower(): Expr {
    const base = parsePostfix()
    if (!isOperator(peek(), '^')) {
      return base
    }
    next()
    return { kind: 'binary', op: 'power', left: base, right: parseUnary() }
  }

  function parsePostfix(): Expr {
    let operand = parsePrimary()
    while (isOperator(peek(), '%')) {
      next()
      operand = { kind: 'unary', op: 'percentage', operand }
    }
    return operand
  }

  function parsePrimary(): Expr {
    const token = next()
    if (token?.type === 'number') {
      return { kind: 'number', value: token.value }
    }
    if (token?.type === 'sqrt') {
      return { kind: 'unary', op: 'sqrt', operand: parsePrimary() }
    }
    if (token?.type === 'open') {
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
    if (token.type !== 'close') {
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
