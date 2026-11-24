package calculator

import (
	"errors"
	"math"
	"testing"
)

type binaryCase struct {
	name    string
	a, b    float64
	want    float64
	wantErr error
}

type unaryCase struct {
	name    string
	a       float64
	want    float64
	wantErr error
}

func runBinaryCases(t *testing.T, op func(a, b float64) (float64, error), cases []binaryCase) {
	t.Helper()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := op(tc.a, tc.b)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func runUnaryCases(t *testing.T, op func(a float64) (float64, error), cases []unaryCase) {
	t.Helper()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := op(tc.a)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func assertResult(t *testing.T, got float64, err error, want float64, wantErr error) {
	t.Helper()
	if wantErr != nil {
		if !errors.Is(err, wantErr) {
			t.Fatalf("error = %v, want %v", err, wantErr)
		}
		return
	}
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want {
		t.Fatalf("result = %v, want %v", got, want)
	}
}

func TestAdd(t *testing.T) {
	runBinaryCases(t, Add, []binaryCase{
		{name: "positive integers", a: 2, b: 3, want: 5},
		{name: "decimals and negatives", a: -1.5, b: 0.5, want: -1},
		{name: "overflow", a: math.MaxFloat64, b: math.MaxFloat64, wantErr: ErrOverflow},
	})
}

func TestSubtract(t *testing.T) {
	runBinaryCases(t, Subtract, []binaryCase{
		{name: "positive result", a: 5, b: 3, want: 2},
		{name: "negative result", a: 3, b: 5, want: -2},
		{name: "overflow", a: -math.MaxFloat64, b: math.MaxFloat64, wantErr: ErrOverflow},
	})
}

func TestMultiply(t *testing.T) {
	runBinaryCases(t, Multiply, []binaryCase{
		{name: "positive integers", a: 3, b: 4, want: 12},
		{name: "zero times negative", a: 0, b: -1, want: 0},
		{name: "overflow", a: 1e308, b: 10, wantErr: ErrOverflow},
	})
}

func TestDivide(t *testing.T) {
	runBinaryCases(t, Divide, []binaryCase{
		{name: "decimal result", a: 10, b: 4, want: 2.5},
		{name: "by zero", a: 1, b: 0, wantErr: ErrDivisionByZero},
		{name: "zero by zero", a: 0, b: 0, wantErr: ErrDivisionByZero},
		{name: "overflow", a: 1e308, b: 1e-10, wantErr: ErrOverflow},
	})
}

func TestPower(t *testing.T) {
	runBinaryCases(t, Power, []binaryCase{
		{name: "integer exponent", a: 2, b: 10, want: 1024},
		{name: "negative exponent", a: 2, b: -1, want: 0.5},
		{name: "fractional exponent", a: 9, b: 0.5, want: 3},
		{name: "zero to the zero", a: 0, b: 0, want: 1},
		{name: "negative base with fractional exponent", a: -8, b: 0.5, wantErr: ErrUndefinedResult},
		{name: "zero to a negative exponent", a: 0, b: -1, wantErr: ErrUndefinedResult},
		{name: "overflow", a: 10, b: 400, wantErr: ErrOverflow},
	})
}

func TestSqrt(t *testing.T) {
	runUnaryCases(t, Sqrt, []unaryCase{
		{name: "perfect square", a: 9, want: 3},
		{name: "zero", a: 0, want: 0},
		{name: "negative", a: -4, wantErr: ErrNegativeSqrt},
	})
}

func TestPercentage(t *testing.T) {
	runUnaryCases(t, Percentage, []unaryCase{
		{name: "positive", a: 50, want: 0.5},
		{name: "negative", a: -10, want: -0.1},
	})
}
