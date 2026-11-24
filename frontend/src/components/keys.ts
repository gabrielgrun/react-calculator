import type { ValueOf } from '../types'

export const KeyActionType = {
  Input: 'input',
  Backspace: 'backspace',
  Clear: 'clear',
  Submit: 'submit',
} as const
export type KeyActionType = ValueOf<typeof KeyActionType>

export type KeyAction =
  | { type: typeof KeyActionType.Input; text: string }
  | { type: typeof KeyActionType.Backspace }
  | { type: typeof KeyActionType.Clear }
  | { type: typeof KeyActionType.Submit }

export const KeyVariant = {
  Digit: 'digit',
  Operator: 'operator',
  Function: 'function',
  Equals: 'equals',
} as const
export type KeyVariant = ValueOf<typeof KeyVariant>

export interface KeyDefinition {
  label: string
  ariaLabel: string
  action: KeyAction
  variant: KeyVariant
}

function inputKey(text: string, ariaLabel: string, variant: KeyVariant): KeyDefinition {
  return { label: text, ariaLabel, action: { type: KeyActionType.Input, text }, variant }
}

function digitKey(digit: string): KeyDefinition {
  return inputKey(digit, digit, KeyVariant.Digit)
}

export const KEYS: KeyDefinition[] = [
  {
    label: 'C',
    ariaLabel: 'clear',
    action: { type: KeyActionType.Clear },
    variant: KeyVariant.Function,
  },
  {
    label: '⌫',
    ariaLabel: 'backspace',
    action: { type: KeyActionType.Backspace },
    variant: KeyVariant.Function,
  },
  inputKey('(', 'open parenthesis', KeyVariant.Function),
  inputKey(')', 'close parenthesis', KeyVariant.Function),
  inputKey('[', 'open bracket', KeyVariant.Function),
  inputKey(']', 'close bracket', KeyVariant.Function),
  inputKey('√', 'square root', KeyVariant.Function),
  inputKey('^', 'power', KeyVariant.Operator),
  digitKey('7'),
  digitKey('8'),
  digitKey('9'),
  inputKey('÷', 'divide', KeyVariant.Operator),
  digitKey('4'),
  digitKey('5'),
  digitKey('6'),
  inputKey('×', 'multiply', KeyVariant.Operator),
  digitKey('1'),
  digitKey('2'),
  digitKey('3'),
  inputKey('−', 'subtract', KeyVariant.Operator),
  digitKey('0'),
  inputKey('.', 'decimal point', KeyVariant.Digit),
  inputKey('%', 'percent', KeyVariant.Operator),
  inputKey('+', 'add', KeyVariant.Operator),
  {
    label: '=',
    ariaLabel: 'equals',
    action: { type: KeyActionType.Submit },
    variant: KeyVariant.Equals,
  },
]

const KEYBOARD_INPUT: Partial<Record<string, string>> = {
  '*': '×',
  '/': '÷',
  '-': '−',
  r: '√',
}

const PASSTHROUGH_INPUT = /^[\d.+^%()[\]{}]$/

const KEYBOARD_COMMANDS: Partial<Record<string, KeyAction>> = {
  Enter: { type: KeyActionType.Submit },
  '=': { type: KeyActionType.Submit },
  Backspace: { type: KeyActionType.Backspace },
  Escape: { type: KeyActionType.Clear },
  Delete: { type: KeyActionType.Clear },
}

export interface KeyPress {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

export function keyboardAction(press: KeyPress): KeyAction | undefined {
  if (press.ctrlKey || press.metaKey || press.altKey) {
    return undefined
  }
  const mapped = KEYBOARD_INPUT[press.key]
  if (mapped !== undefined) {
    return { type: KeyActionType.Input, text: mapped }
  }
  if (PASSTHROUGH_INPUT.test(press.key)) {
    return { type: KeyActionType.Input, text: press.key }
  }
  return KEYBOARD_COMMANDS[press.key]
}
