import { ExpressionSyntaxError } from './errors'

export type Operator = '+' | '-' | '*' | '/' | '^' | '%'
export type OpenBracket = '(' | '[' | '{'
export type CloseBracket = ')' | ']' | '}'

export type Token =
  | { type: 'number'; value: number; position: number }
  | { type: 'operator'; value: Operator; position: number }
  | { type: 'sqrt'; position: number }
  | { type: 'open'; bracket: OpenBracket; position: number }
  | { type: 'close'; bracket: CloseBracket; position: number }

const OPERATORS: Record<string, Operator> = {
  '+': '+',
  '-': '-',
  '−': '-',
  '*': '*',
  '×': '*',
  '/': '/',
  '÷': '/',
  '^': '^',
  '%': '%',
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
  return { token: { type: 'number', value, position }, length: lexeme.length }
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
      tokens.push({ type: 'operator', value: OPERATORS[char], position })
      position += 1
    } else if (char === '√') {
      tokens.push({ type: 'sqrt', position })
      position += 1
    } else if (char in OPEN_BRACKETS) {
      tokens.push({ type: 'open', bracket: OPEN_BRACKETS[char], position })
      position += 1
    } else if (char in CLOSE_BRACKETS) {
      tokens.push({ type: 'close', bracket: CLOSE_BRACKETS[char], position })
      position += 1
    } else {
      throw new ExpressionSyntaxError(`Unexpected character "${char}"`, position)
    }
  }

  return tokens
}
