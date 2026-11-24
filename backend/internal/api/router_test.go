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

func TestNewRouter_APIErrorsStayJSONWhenServingStaticFiles(t *testing.T) {
	router := NewRouter(slog.New(slog.DiscardHandler), http.FileServer(http.Dir(t.TempDir())))

	wrongMethod := serve(t, router, http.MethodGet, "/api/v1/add", "")
	if wrongMethod.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET /api/v1/add = %d, want 405", wrongMethod.Code)
	}
	if allow := wrongMethod.Header().Get("Allow"); allow != http.MethodPost {
		t.Fatalf("Allow = %q, want POST", allow)
	}
	assertJSON(t, wrongMethod.Body.Bytes(), errorBody("method_not_allowed", "use POST for /api/v1/add"))

	unknown := serve(t, router, http.MethodPost, "/api/v1/modulo", `{"a":1,"b":2}`)
	if unknown.Code != http.StatusNotFound {
		t.Fatalf("POST /api/v1/modulo = %d, want 404", unknown.Code)
	}
	assertJSON(t, unknown.Body.Bytes(), errorBody("not_found", "no API endpoint at /api/v1/modulo"))
}
