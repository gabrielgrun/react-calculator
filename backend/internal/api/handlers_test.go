package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
)

type routeCase struct {
	name       string
	method     string
	path       string
	body       string
	wantStatus int
	wantBody   string
}

func newTestRouter() http.Handler {
	return NewRouter(slog.New(slog.DiscardHandler), nil)
}

func serve(t *testing.T, router http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func assertJSON(t *testing.T, got []byte, want string) {
	t.Helper()
	var gotValue, wantValue any
	if err := json.Unmarshal(got, &gotValue); err != nil {
		t.Fatalf("response is not JSON: %q", got)
	}
	if err := json.Unmarshal([]byte(want), &wantValue); err != nil {
		t.Fatalf("bad expectation %q: %v", want, err)
	}
	if !reflect.DeepEqual(gotValue, wantValue) {
		t.Fatalf("body = %s, want %s", got, want)
	}
}

func errorBody(code, message string) string {
	body, _ := json.Marshal(map[string]map[string]string{"error": {"code": code, "message": message}})
	return string(body)
}

func runRouteCases(t *testing.T, cases []routeCase) {
	t.Helper()
	router := newTestRouter()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			method := tc.method
			if method == "" {
				method = http.MethodPost
			}
			rec := serve(t, router, method, tc.path, tc.body)
			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body %s)", rec.Code, tc.wantStatus, rec.Body.String())
			}
			if tc.wantBody == "" {
				return
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("Content-Type = %q, want application/json", got)
			}
			assertJSON(t, rec.Body.Bytes(), tc.wantBody)
		})
	}
}

func TestOperations_Success(t *testing.T) {
	runRouteCases(t, []routeCase{
		{name: "add", path: "/api/v1/add", body: `{"a":2,"b":3}`, wantStatus: 200, wantBody: `{"result":5}`},
		{name: "subtract", path: "/api/v1/subtract", body: `{"a":5,"b":3}`, wantStatus: 200, wantBody: `{"result":2}`},
		{name: "multiply", path: "/api/v1/multiply", body: `{"a":3,"b":4}`, wantStatus: 200, wantBody: `{"result":12}`},
		{name: "divide", path: "/api/v1/divide", body: `{"a":10,"b":4}`, wantStatus: 200, wantBody: `{"result":2.5}`},
		{name: "power", path: "/api/v1/power", body: `{"a":2,"b":10}`, wantStatus: 200, wantBody: `{"result":1024}`},
		{name: "sqrt", path: "/api/v1/sqrt", body: `{"a":9}`, wantStatus: 200, wantBody: `{"result":3}`},
		{name: "percentage", path: "/api/v1/percentage", body: `{"a":50}`, wantStatus: 200, wantBody: `{"result":0.5}`},
		{name: "zero operands are not missing", path: "/api/v1/add", body: `{"a":0,"b":0}`, wantStatus: 200, wantBody: `{"result":0}`},
	})
}

func TestOperations_MathErrors(t *testing.T) {
	runRouteCases(t, []routeCase{
		{name: "division by zero", path: "/api/v1/divide", body: `{"a":1,"b":0}`, wantStatus: 422, wantBody: errorBody("division_by_zero", "division by zero")},
		{name: "negative sqrt", path: "/api/v1/sqrt", body: `{"a":-4}`, wantStatus: 422, wantBody: errorBody("negative_sqrt", "square root of a negative number")},
		{name: "undefined result", path: "/api/v1/power", body: `{"a":-8,"b":0.5}`, wantStatus: 422, wantBody: errorBody("undefined_result", "result is undefined")},
		{name: "overflow", path: "/api/v1/multiply", body: `{"a":1e308,"b":10}`, wantStatus: 422, wantBody: errorBody("overflow", "result is out of range")},
	})
}

func TestOperations_InvalidInput(t *testing.T) {
	runRouteCases(t, []routeCase{
		{name: "missing b", path: "/api/v1/add", body: `{"a":2}`, wantStatus: 400, wantBody: errorBody("missing_operand", `operand "b" is required`)},
		{name: "missing a on unary", path: "/api/v1/sqrt", body: `{}`, wantStatus: 400, wantBody: errorBody("missing_operand", `operand "a" is required`)},
		{name: "null body", path: "/api/v1/add", body: `null`, wantStatus: 400, wantBody: errorBody("missing_operand", `operand "a" is required`)},
		{name: "string operand", path: "/api/v1/add", body: `{"a":"2","b":3}`, wantStatus: 400, wantBody: errorBody("invalid_json", "request body must be a JSON object with numeric operands")},
		{name: "malformed JSON", path: "/api/v1/add", body: `{not json`, wantStatus: 400, wantBody: errorBody("invalid_json", "request body must be a JSON object with numeric operands")},
		{name: "unknown field", path: "/api/v1/add", body: `{"a":1,"b":2,"c":3}`, wantStatus: 400, wantBody: errorBody("invalid_json", "request body must be a JSON object with numeric operands")},
		{name: "array body", path: "/api/v1/add", body: `[1,2]`, wantStatus: 400, wantBody: errorBody("invalid_json", "request body must be a JSON object with numeric operands")},
		{name: "trailing data", path: "/api/v1/add", body: `{"a":1,"b":2}xyz`, wantStatus: 400, wantBody: errorBody("invalid_json", "request body must be a JSON object with numeric operands")},
		{name: "empty body", path: "/api/v1/add", body: ``, wantStatus: 400, wantBody: errorBody("invalid_json", "request body must be a JSON object with numeric operands")},
		{name: "body too large", path: "/api/v1/add", body: `{"a":1,"b":2` + strings.Repeat(" ", 2000) + `}`, wantStatus: 413, wantBody: errorBody("payload_too_large", "request body must not exceed 1024 bytes")},
	})
}

func TestRouting(t *testing.T) {
	runRouteCases(t, []routeCase{
		{name: "wrong method", method: http.MethodGet, path: "/api/v1/add", wantStatus: 405},
		{name: "unknown operation", path: "/api/v1/modulo", body: `{"a":1,"b":2}`, wantStatus: 404},
		{name: "health check", method: http.MethodGet, path: "/healthz", wantStatus: 200, wantBody: `{"status":"ok"}`},
	})
}
