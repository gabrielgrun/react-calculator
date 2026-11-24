package api

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gabrielgrun/react-calculator/backend/internal/calculator"
)

func NewRouter(logger *slog.Logger, static http.Handler) http.Handler {
	mux := http.NewServeMux()
	route(mux, http.MethodPost, "/api/v1/add", handleBinary(calculator.Add))
	route(mux, http.MethodPost, "/api/v1/subtract", handleBinary(calculator.Subtract))
	route(mux, http.MethodPost, "/api/v1/multiply", handleBinary(calculator.Multiply))
	route(mux, http.MethodPost, "/api/v1/divide", handleBinary(calculator.Divide))
	route(mux, http.MethodPost, "/api/v1/power", handleBinary(calculator.Power))
	route(mux, http.MethodPost, "/api/v1/sqrt", handleUnary(calculator.Sqrt))
	route(mux, http.MethodPost, "/api/v1/percentage", handleUnary(calculator.Percentage))
	route(mux, http.MethodGet, "/healthz", http.HandlerFunc(handleHealth))
	mux.HandleFunc("/api/", handleNotFound)
	if static != nil {
		mux.Handle("/", static)
	}
	return logRequests(logger, mux)
}

func route(mux *http.ServeMux, method, path string, handler http.Handler) {
	mux.Handle(method+" "+path, handler)
	mux.HandleFunc(path, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Allow", method)
		writeError(w, http.StatusMethodNotAllowed, codeMethodNotAllowed, fmt.Sprintf("use %s for %s", method, path))
	})
}

func handleNotFound(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, codeNotFound, fmt.Sprintf("no API endpoint at %s", r.URL.Path))
}
