import { KEYS, type KeyAction, KeyActionType } from './keys'

interface KeypadProps {
  onKey: (action: KeyAction) => void
  busy: boolean
}

export function Keypad({ onKey, busy }: KeypadProps) {
  return (
    <div className="keypad">
      {KEYS.map((key) => {
        const isSubmit = key.action.type === KeyActionType.Submit
        return (
          <button
            key={key.ariaLabel}
            type="button"
            className={`key key--${key.variant}`}
            aria-label={key.ariaLabel}
            disabled={isSubmit && busy}
            aria-busy={isSubmit ? busy : undefined}
            onClick={() => onKey(key.action)}
          >
            {key.label}
          </button>
        )
      })}
    </div>
  )
}
