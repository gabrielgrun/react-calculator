package calculator

import (
	"errors"
	"math"
)

var (
	ErrDivisionByZero  = errors.New("division by zero")
	ErrNegativeSqrt    = errors.New("square root of a negative number")
	ErrUndefinedResult = errors.New("result is undefined")
	ErrOverflow        = errors.New("result is out of range")
)

func Add(a, b float64) (float64, error) {
	return checkResult(a + b)
}

func Subtract(a, b float64) (float64, error) {
	return checkResult(a - b)
}

func Multiply(a, b float64) (float64, error) {
	return checkResult(a * b)
}

func Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return checkResult(a / b)
}

func Power(a, b float64) (float64, error) {
	if a == 0 && b < 0 {
		return 0, ErrUndefinedResult
	}
	return checkResult(math.Pow(a, b))
}

func Sqrt(a float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSqrt
	}
	return checkResult(math.Sqrt(a))
}

func Percentage(a float64) (float64, error) {
	return checkResult(a / 100)
}

func checkResult(result float64) (float64, error) {
	if math.IsNaN(result) {
		return 0, ErrUndefinedResult
	}
	if math.IsInf(result, 0) {
		return 0, ErrOverflow
	}
	return result, nil
}
