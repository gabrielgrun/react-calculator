import type { ValueOf } from '../types'
import { ExpressionSyntaxError } from './errors'

export const Operator = {
  Plus: '+',
  Minus: '-',
  Times: '*',
  Divide: '/',
  Power: '^',
  Percent: '%',
} as const
export type Operator = ValueOf<typeof Operator>

export const TokenType = {
  Number: 'number',
  Operator: 'operator',
  Sqrt: 'sqrt',
  Open: 'open',
  Close: 'close',
} as const
export type TokenType = ValueOf<typeof TokenType>

export type OpenBracket = '(' | '[' | '{'
export type CloseBracket = ')' | ']' | '}'

export type Token =
  | { type: typeof TokenType.Number; value: number; position: number }
  | { type: typeof TokenType.Operator; value: Operator; position: number }
  | { type: typeof TokenType.Sqrt; position: number }
  | { type: typeof TokenType.Open; bracket: OpenBracket; position: number }
  | { type: typeof TokenType.Close; bracket: CloseBracket; position: number }

const OPERATORS: Record<string, Operator> = {
  '+': Operator.Plus,
  '-': Operator.Minus,
  '−': Operator.Minus,
  '*': Operator.Times,
  '×': Operator.Times,
  '/': Operator.Divide,
  '÷': Operator.Divide,
  '^': Operator.Power,
  '%': Operator.Percent,
}

const OPEN_BRACKETS: Record<string, OpenBracket> = { '(': '(', '[': '[', '{': '{' }
const CLOSE_BRACKETS: Record<string, CloseBracket> = { ')': ')', ']': ']', '}': '}' }

const NUMBER_CANDIDATE = /[\d.]+(?:[eE][+-]?\d+)?/y
const VALID_NUMBER = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/
const WHITESPACE = /\s/

function readNumber(input: string, position: number): { token: Token; length: number } {
  NUMBER_CANDIDATE.lastIndex = position
  const lexeme = NUMBER_CANDIDATE.exec(input)?.[0] ?? ''
  if (!VALID_NUMBER.test(lexeme)) {
    throw new ExpressionSyntaxError(`Invalid number "${lexeme}"`, position)
  }
  const value = Number(lexeme)
  if (!Number.isFinite(value)) {
    throw new ExpressionSyntaxError(`Number "${lexeme}" is too large`, position)
  }
  return { token: { type: TokenType.Number, value, position }, length: lexeme.length }
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let position = 0

  while (position < input.length) {
    const char = input[position]

    if (WHITESPACE.test(char)) {
      position += 1
    } else if (/[\d.]/.test(char)) {
      const { token, length } = readNumber(input, position)
      tokens.push(token)
      position += length
    } else if (char in OPERATORS) {
      tokens.push({ type: TokenType.Operator, value: OPERATORS[char], position })
      position += 1
    } else if (char === '√') {
      tokens.push({ type: TokenType.Sqrt, position })
      position += 1
    } else if (char in OPEN_BRACKETS) {
      tokens.push({ type: TokenType.Open, bracket: OPEN_BRACKETS[char], position })
      position += 1
    } else if (char in CLOSE_BRACKETS) {
      tokens.push({ type: TokenType.Close, bracket: CLOSE_BRACKETS[char], position })
      position += 1
    } else {
      throw new ExpressionSyntaxError(`Unexpected character "${char}"`, position)
    }
  }

  return tokens
}
