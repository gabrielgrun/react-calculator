import { BinaryOperation, type CalculatorApi, type Expr, ExprKind, UnaryOperator } from '../types'

export async function evaluate(expr: Expr, api: CalculatorApi): Promise<number> {
  switch (expr.kind) {
    case ExprKind.Number:
      return expr.value
    case ExprKind.Binary: {
      const [left, right] = await Promise.all([evaluate(expr.left, api), evaluate(expr.right, api)])
      return api.binary(expr.op, left, right)
    }
    case ExprKind.Unary: {
      const operand = await evaluate(expr.operand, api)
      if (expr.op === UnaryOperator.Negate) {
        return api.binary(BinaryOperation.Subtract, 0, operand)
      }
      return api.unary(expr.op, operand)
    }
  }
}
