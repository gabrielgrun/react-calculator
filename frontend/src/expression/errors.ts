export class ExpressionSyntaxError extends Error {
  readonly position: number

  constructor(message: string, position: number) {
    super(message)
    this.name = 'ExpressionSyntaxError'
    this.position = position
  }
}
