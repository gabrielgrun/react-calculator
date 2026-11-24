import { describe, expect, it } from 'vitest'
import type { Expr } from './ast'
import { ExpressionSyntaxError } from './errors'
import { MAX_EXPRESSION_LENGTH, parse } from './parser'

const BINARY_SYMBOLS = { add: '+', subtract: '-', multiply: '*', divide: '/', power: '^' }
const UNARY_NAMES = { negate: 'neg', sqrt: 'sqrt', percentage: 'pct' }

function show(expr: Expr): string {
  switch (expr.kind) {
    case 'number':
      return String(expr.value)
    case 'binary':
      return `(${show(expr.left)} ${BINARY_SYMBOLS[expr.op]} ${show(expr.right)})`
    case 'unary':
      return `${UNARY_NAMES[expr.op]}(${show(expr.operand)})`
  }
}

function syntaxErrorOf(input: string): ExpressionSyntaxError {
  try {
    parse(input)
  } catch (error) {
    if (error instanceof ExpressionSyntaxError) {
      return error
    }
    throw error
  }
  throw new Error(`expected parse(${JSON.stringify(input)}) to throw`)
}

describe('parse', () => {
  it.each([
    ['2+3*4', '(2 + (3 * 4))'],
    ['(2+3)*4', '((2 + 3) * 4)'],
    ['8-3-2', '((8 - 3) - 2)'],
    ['8/4/2', '((8 / 4) / 2)'],
  ])('applies precedence and left associativity: %s', (input, tree) => {
    expect(show(parse(input))).toBe(tree)
  })

  it.each([
    ['2^3^2', '(2 ^ (3 ^ 2))'],
    ['-2^2', 'neg((2 ^ 2))'],
    ['2^-1', '(2 ^ neg(1))'],
    ['2*-3', '(2 * neg(3))'],
    ['2--3', '(2 - neg(3))'],
  ])('handles powers and negation: %s', (input, tree) => {
    expect(show(parse(input))).toBe(tree)
  })

  it.each([
    ['√9+1', '(sqrt(9) + 1)'],
    ['√(4+5)', 'sqrt((4 + 5))'],
    ['√√16', 'sqrt(sqrt(16))'],
    ['200*10%', '(200 * pct(10))'],
    ['50%%', 'pct(pct(50))'],
  ])('handles square roots and percentages: %s', (input, tree) => {
    expect(show(parse(input))).toBe(tree)
  })

  it.each([
    ['2*[3+(4-1)]', '(2 * (3 + (4 - 1)))'],
    ['{1+[2*(3)]}', '(1 + (2 * 3))'],
  ])('treats every bracket kind as grouping: %s', (input, tree) => {
    expect(show(parse(input))).toBe(tree)
  })

  it.each([
    ['', 'Enter an expression'],
    ['   ', 'Enter an expression'],
    ['[(1+2]', 'Expected ")" but found "]"'],
    ['(1+2', 'Missing closing ")"'],
    ['(1 2)', 'Unexpected number'],
    ['1+2)', 'Unexpected ")"'],
    ['1+', 'Unexpected end of expression'],
    ['*2', 'Unexpected "*"'],
    ['2 3', 'Unexpected number'],
    ['√-4', 'Unexpected "-"'],
    ['2^', 'Unexpected end of expression'],
    ['()', 'Unexpected ")"'],
    ['√', 'Unexpected end of expression'],
  ])('rejects %j with "%s"', (input, message) => {
    expect(syntaxErrorOf(input).message).toBe(message)
  })

  it('rejects expressions longer than the maximum length', () => {
    const input = '1+'.repeat(100) + '1'

    expect(input).toHaveLength(MAX_EXPRESSION_LENGTH + 1)
    expect(syntaxErrorOf(input).message).toBe('Expression is too long (max 200 characters)')
  })

  it('accepts an expression of exactly the maximum length', () => {
    expect(() => parse('1'.repeat(MAX_EXPRESSION_LENGTH))).not.toThrow()
  })
})
