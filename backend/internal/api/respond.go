package api

import (
	"encoding/json"
	"net/http"
)

type errorDetail struct {
	Code    errorCode `json:"code"`
	Message string    `json:"message"`
}

type errorResponse struct {
	Error errorDetail `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code errorCode, message string) {
	writeJSON(w, status, errorResponse{Error: errorDetail{Code: code, Message: message}})
}
