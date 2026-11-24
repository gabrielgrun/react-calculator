import { describe, expect, it } from 'vitest'
import { ExpressionSyntaxError } from './errors'
import { tokenize } from './tokenizer'

function syntaxErrorOf(input: string): ExpressionSyntaxError {
  try {
    tokenize(input)
  } catch (error) {
    if (error instanceof ExpressionSyntaxError) {
      return error
    }
    throw error
  }
  throw new Error(`expected tokenize(${JSON.stringify(input)}) to throw`)
}

describe('tokenize', () => {
  it('splits numbers and operators, recording positions', () => {
    expect(tokenize('2+3')).toEqual([
      { type: 'number', value: 2, position: 0 },
      { type: 'operator', value: '+', position: 1 },
      { type: 'number', value: 3, position: 2 },
    ])
  })

  it('normalizes display symbols to keyboard operators', () => {
    expect(tokenize('1×2÷3−4').map((token) => ('value' in token ? token.value : null))).toEqual([
      1,
      '*',
      2,
      '/',
      3,
      '-',
      4,
    ])
  })

  it('skips whitespace', () => {
    expect(tokenize(' 2 * 3 ')).toHaveLength(3)
  })

  it.each([
    ['3', 3],
    ['0.5', 0.5],
    ['.5', 0.5],
    ['12.', 12],
    ['1e+25', 1e25],
    ['2.5e-3', 0.0025],
    ['1E3', 1000],
  ])('reads the number %s', (input, value) => {
    expect(tokenize(input)).toEqual([{ type: 'number', value, position: 0 }])
  })

  it('reads square roots, powers, percentages and every bracket kind', () => {
    expect(tokenize('√[2]^{3}%(1)')).toEqual([
      { type: 'sqrt', position: 0 },
      { type: 'open', bracket: '[', position: 1 },
      { type: 'number', value: 2, position: 2 },
      { type: 'close', bracket: ']', position: 3 },
      { type: 'operator', value: '^', position: 4 },
      { type: 'open', bracket: '{', position: 5 },
      { type: 'number', value: 3, position: 6 },
      { type: 'close', bracket: '}', position: 7 },
      { type: 'operator', value: '%', position: 8 },
      { type: 'open', bracket: '(', position: 9 },
      { type: 'number', value: 1, position: 10 },
      { type: 'close', bracket: ')', position: 11 },
    ])
  })

  it('rejects a number with two decimal points', () => {
    expect(syntaxErrorOf('1.2.3')).toMatchObject({ message: 'Invalid number "1.2.3"', position: 0 })
  })

  it('rejects a lone decimal point', () => {
    expect(syntaxErrorOf('.')).toMatchObject({ message: 'Invalid number "."', position: 0 })
  })

  it('rejects numbers too large to represent', () => {
    expect(syntaxErrorOf('1+1e999')).toMatchObject({
      message: 'Number "1e999" is too large',
      position: 2,
    })
  })

  it('rejects unknown characters', () => {
    expect(syntaxErrorOf('2a')).toMatchObject({ message: 'Unexpected character "a"', position: 1 })
  })
})
