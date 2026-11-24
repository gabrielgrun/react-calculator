package api

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"testing"
)

func TestNewRouter_ServesStaticFilesAlongsideAPI(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<h1>calculator</h1>"), 0o600); err != nil {
		t.Fatal(err)
	}
	router := NewRouter(slog.New(slog.DiscardHandler), http.FileServer(http.Dir(dir)))

	page := serve(t, router, http.MethodGet, "/", "")
	if page.Code != http.StatusOK || page.Body.String() != "<h1>calculator</h1>" {
		t.Fatalf("GET / = %d %q", page.Code, page.Body.String())
	}

	api := serve(t, router, http.MethodPost, "/api/v1/add", `{"a":2,"b":3}`)
	if api.Code != http.StatusOK {
		t.Fatalf("POST /api/v1/add = %d", api.Code)
	}
	assertJSON(t, api.Body.Bytes(), `{"result":5}`)
}

func TestNewRouter_WithoutStaticReturnsNotFoundForRoot(t *testing.T) {
	rec := serve(t, newTestRouter(), http.MethodGet, "/", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("GET / = %d, want 404", rec.Code)
	}
}
