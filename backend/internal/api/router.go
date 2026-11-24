package api

import (
	"log/slog"
	"net/http"

	"github.com/gabrielgrun/react-calculator/backend/internal/calculator"
)

func NewRouter(logger *slog.Logger, static http.Handler) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("POST /api/v1/add", handleBinary(calculator.Add))
	mux.Handle("POST /api/v1/subtract", handleBinary(calculator.Subtract))
	mux.Handle("POST /api/v1/multiply", handleBinary(calculator.Multiply))
	mux.Handle("POST /api/v1/divide", handleBinary(calculator.Divide))
	mux.Handle("POST /api/v1/power", handleBinary(calculator.Power))
	mux.Handle("POST /api/v1/sqrt", handleUnary(calculator.Sqrt))
	mux.Handle("POST /api/v1/percentage", handleUnary(calculator.Percentage))
	mux.HandleFunc("GET /healthz", handleHealth)
	if static != nil {
		mux.Handle("/", static)
	}
	return logRequests(logger, mux)
}
