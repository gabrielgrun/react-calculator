package api

import (
	"bytes"
	"log/slog"
	"net/http"
	"strings"
	"testing"
)

func TestLogRequests_RecordsStatusAndPath(t *testing.T) {
	var logs bytes.Buffer
	router := NewRouter(slog.New(slog.NewJSONHandler(&logs, nil)), nil)

	serve(t, router, http.MethodPost, "/api/v1/divide", `{"a":1,"b":0}`)

	line := logs.String()
	for _, want := range []string{`"status":422`, `"path":"/api/v1/divide"`, `"method":"POST"`, `"duration"`} {
		if !strings.Contains(line, want) {
			t.Fatalf("log line %q does not contain %s", line, want)
		}
	}
}
