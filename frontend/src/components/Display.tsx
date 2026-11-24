import { formatResult } from '@/calculator/format'
import { DisplayKind, type DisplayState } from '@/types'

interface DisplayProps {
  expression: string
  display: DisplayState
}

function statusText(display: DisplayState): string {
  switch (display.kind) {
    case DisplayKind.Idle:
      return ''
    case DisplayKind.Loading:
      return 'Calculating…'
    case DisplayKind.Result:
      return formatResult(display.value)
    case DisplayKind.Error:
      return display.message
  }
}

export function Display({ expression, display }: DisplayProps) {
  return (
    <div className="display">
      <div className="display__expression" aria-label="Expression">
        {expression}
      </div>
      <div className={`display__status display__status--${display.kind}`} role="status">
        {statusText(display)}
      </div>
    </div>
  )
}
