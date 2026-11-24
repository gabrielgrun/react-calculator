// Package calculator implements the arithmetic operations exposed by the API.
// Every operation reports NaN as ErrUndefinedResult and ±Inf as ErrOverflow.
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

// Add returns a + b.
func Add(a, b float64) (float64, error) {
	return checkResult(a + b)
}

// Subtract returns a - b.
func Subtract(a, b float64) (float64, error) {
	return checkResult(a - b)
}

// Multiply returns a * b.
func Multiply(a, b float64) (float64, error) {
	return checkResult(a * b)
}

// Divide returns a / b, or ErrDivisionByZero when b is 0.
func Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return checkResult(a / b)
}

// Power returns a raised to b. Zero to a negative exponent is ErrUndefinedResult.
func Power(a, b float64) (float64, error) {
	if a == 0 && b < 0 {
		return 0, ErrUndefinedResult
	}
	return checkResult(math.Pow(a, b))
}

// Sqrt returns the square root of a, or ErrNegativeSqrt when a is negative.
func Sqrt(a float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSqrt
	}
	return checkResult(math.Sqrt(a))
}

// Percentage returns a percent as a fraction, so 50 becomes 0.5.
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
