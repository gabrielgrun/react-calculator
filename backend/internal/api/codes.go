package api

type errorCode string

const (
	codeInvalidJSON       errorCode = "invalid_json"
	codeMissingOperand    errorCode = "missing_operand"
	codePayloadTooLarge   errorCode = "payload_too_large"
	codeNotFound          errorCode = "not_found"
	codeMethodNotAllowed  errorCode = "method_not_allowed"
	codeDivisionByZero    errorCode = "division_by_zero"
	codeNegativeSqrt      errorCode = "negative_sqrt"
	codeUndefinedResult   errorCode = "undefined_result"
	codeOverflow          errorCode = "overflow"
	codeCalculationFailed errorCode = "calculation_failed"
)
