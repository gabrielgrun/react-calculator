import type { CalculatorApi } from '../api/calculatorClient'
import type { Expr } from './ast'

export async function evaluate(expr: Expr, api: CalculatorApi): Promise<number> {
  switch (expr.kind) {
    case 'number':
      return expr.value
    case 'binary': {
      const [left, right] = await Promise.all([evaluate(expr.left, api), evaluate(expr.right, api)])
      return api.binary(expr.op, left, right)
    }
    case 'unary': {
      const operand = await evaluate(expr.operand, api)
      if (expr.op === 'negate') {
        return api.binary('subtract', 0, operand)
      }
      return api.unary(expr.op, operand)
    }
  }
}
