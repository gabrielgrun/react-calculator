package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/gabrielgrun/react-calculator/backend/internal/calculator"
)

const maxBodyBytes = 1024

var errInvalidJSON = errors.New("request body must be a JSON object with numeric operands")

type binaryRequest struct {
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

type unaryRequest struct {
	A *float64 `json:"a"`
}

type resultResponse struct {
	Result float64 `json:"result"`
}

type statusResponse struct {
	Status string `json:"status"`
}

func handleBinary(op func(a, b float64) (float64, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req binaryRequest
		if !decodeRequest(w, r, &req) {
			return
		}
		if !requireOperand(w, "a", req.A) || !requireOperand(w, "b", req.B) {
			return
		}
		result, err := op(*req.A, *req.B)
		respondWithResult(w, result, err)
	}
}

func handleUnary(op func(a float64) (float64, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req unaryRequest
		if !decodeRequest(w, r, &req) {
			return
		}
		if !requireOperand(w, "a", req.A) {
			return
		}
		result, err := op(*req.A)
		respondWithResult(w, result, err)
	}
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, statusResponse{Status: "ok"})
}

func decodeRequest(w http.ResponseWriter, r *http.Request, dst any) bool {
	err := decodeJSON(w, r, dst)
	if err == nil {
		return true
	}
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		writeError(w, http.StatusRequestEntityTooLarge, "payload_too_large",
			fmt.Sprintf("request body must not exceed %d bytes", maxBodyBytes))
		return false
	}
	writeError(w, http.StatusBadRequest, "invalid_json", errInvalidJSON.Error())
	return false
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		return err
	}
	err := decoder.Decode(&struct{}{})
	var tooLarge *http.MaxBytesError
	switch {
	case errors.Is(err, io.EOF):
		return nil
	case errors.As(err, &tooLarge):
		return err
	default:
		return errInvalidJSON
	}
}

func requireOperand(w http.ResponseWriter, name string, value *float64) bool {
	if value != nil {
		return true
	}
	writeError(w, http.StatusBadRequest, "missing_operand", fmt.Sprintf("operand %q is required", name))
	return false
}

func respondWithResult(w http.ResponseWriter, result float64, err error) {
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, mathErrorCode(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resultResponse{Result: result})
}

var mathErrorCodes = []struct {
	err  error
	code string
}{
	{calculator.ErrDivisionByZero, "division_by_zero"},
	{calculator.ErrNegativeSqrt, "negative_sqrt"},
	{calculator.ErrUndefinedResult, "undefined_result"},
	{calculator.ErrOverflow, "overflow"},
}

func mathErrorCode(err error) string {
	for _, entry := range mathErrorCodes {
		if errors.Is(err, entry.err) {
			return entry.code
		}
	}
	return "calculation_failed"
}
