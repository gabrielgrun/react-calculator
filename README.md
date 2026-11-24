# React Calculator

[![CI](https://github.com/gabrielgrun/react-calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielgrun/react-calculator/actions/workflows/ci.yml)

A full-stack calculator: a **React + TypeScript** single-page app that understands full expressions
(precedence, `()`, `[]`, `{}`), backed by a **Go** REST microservice that performs every arithmetic
operation.

Supports addition, subtraction, multiplication, division, exponentiation, square root and
percentage.

## Quick start (Docker)

The only requirement is Docker.

```bash
docker compose up --build
```

Open **http://localhost:8080**. One container serves both the UI and the API.

## Development

Prerequisites: **Go 1.27+** and **Node.js 22+**.

**Backend** (http://localhost:8080):

```bash
cd backend
go run ./cmd/server
```

Environment variables: `PORT` (default `8080`) and `STATIC_DIR` (optional folder with the built
frontend to serve at `/`).

**Frontend** (http://localhost:5173, with hot reload):

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8080`, so start the backend first.

A `Makefile` wraps the common commands: `make test`, `make coverage`, `make lint`,
`make run-backend`, `make run-frontend`, `make docker-up`.

## Tests & coverage

```bash
make test       # backend (go test -race) + frontend (vitest)
make coverage   # writes backend/coverage.html and frontend/coverage/index.html
```

| Layer | Tests | Coverage (statements) |
|---|---|---|
| Backend — `internal/calculator` | table-driven unit tests | 100% |
| Backend — `internal/api` | HTTP tests through the real router (`httptest`) | 97.1% |
| Backend — `cmd/server` | config + startup/graceful shutdown | 67.9% (the rest is `main()` wiring) |
| **Backend total** | | **90.4%** |
| Frontend (97 tests) | tokenizer, parser, evaluator, API client, state hook, components | **98.8%** (97.4% branches) |

`npm run test:coverage` fails below 90% lines/functions/statements or 85% branches. CI uploads both
coverage reports as artifacts on every push.

## API

All operations are `POST` with a JSON body, under `/api/v1`.

| Endpoint | Body | Result |
|---|---|---|
| `/add`, `/subtract`, `/multiply`, `/divide`, `/power` | `{"a": number, "b": number}` | `{"result": number}` |
| `/sqrt` | `{"a": number}` | `{"result": number}` |
| `/percentage` | `{"a": number}` — returns `a / 100` | `{"result": number}` |
| `GET /healthz` | — | `{"status": "ok"}` |

Errors always have the same shape: `{"error": {"code": "...", "message": "..."}}`.

| Status | Codes | When |
|---|---|---|
| 400 | `invalid_json` | malformed JSON, wrong types, unknown fields, trailing data |
| 400 | `missing_operand` | `a` or `b` absent (`0` is a valid operand) |
| 413 | `payload_too_large` | body over 1 KB |
| 422 | `division_by_zero`, `negative_sqrt`, `undefined_result`, `overflow` | valid request, impossible math |

### Examples

```bash
curl -X POST localhost:8080/api/v1/add -d '{"a":2,"b":3}'
# 200 {"result":5}

curl -X POST localhost:8080/api/v1/divide -d '{"a":10,"b":4}'
# 200 {"result":2.5}

curl -X POST localhost:8080/api/v1/power -d '{"a":2,"b":10}'
# 200 {"result":1024}

curl -X POST localhost:8080/api/v1/sqrt -d '{"a":9}'
# 200 {"result":3}

curl -X POST localhost:8080/api/v1/divide -d '{"a":1,"b":0}'
# 422 {"error":{"code":"division_by_zero","message":"division by zero"}}

curl -X POST localhost:8080/api/v1/sqrt -d '{"a":-4}'
# 422 {"error":{"code":"negative_sqrt","message":"square root of a negative number"}}

curl -X POST localhost:8080/api/v1/add -d '{"a":2}'
# 400 {"error":{"code":"missing_operand","message":"operand \"b\" is required"}}

curl -X POST localhost:8080/api/v1/add -d '{"a":"2","b":3}'
# 400 {"error":{"code":"invalid_json","message":"request body must be a JSON object with numeric operands"}}
```

## How the expression engine works

The UI lets users type whole expressions such as `2×[3+(4−1)]`. The frontend turns the text into a
tree and asks the backend to compute each node, so **every endpoint above is used by the UI**.

1. **Tokenizer** (`frontend/src/expression/tokenizer.ts`) turns text into tokens: numbers
   (including `1e+25`), operators, `√` and brackets. It accepts both `× ÷ −` and `* / -`.
2. **Parser** (`frontend/src/expression/parser.ts`) is a recursive-descent parser with one function
   per precedence level, from lowest to highest:

   ```
   expression := term (("+" | "-") term)*
   term       := unary (("*" | "/") unary)*
   unary      := "-" unary | power
   power      := postfix ("^" unary)?          right-associative: 2^3^2 = 512
   postfix    := primary "%"*
   primary    := number | "√" primary | open expression close
   ```

   Brackets must match by kind: `[(1+2]` → `Expected ")" but found "]"`.
3. **Evaluator** (`frontend/src/expression/evaluator.ts`) walks the tree bottom-up and calls one
   endpoint per operation, with independent branches in parallel:

   ```
   2 × [3 + (4 − 1)]

           ×                 POST /subtract {4,1} → 3
          / \                POST /add      {3,3} → 6
         2   +               POST /multiply {2,6} → 12
            / \
           3   −
              / \
             4   1
   ```

## Design decisions & assumptions

- **The frontend parses, the backend computes.** Approaches considered:
  - *(chosen)* The frontend builds the tree and calls one endpoint per operation. The frontend
    owns input syntax (brackets, precedence) and the backend owns arithmetic and its edge cases.
    No endpoint exists only to satisfy the brief.
  - A single `/calculate` endpoint receiving the whole expression. Fewer requests, but the
    per-operation endpoints the brief asks for would be unused.
  - A "pocket calculator" UI that computes after each operator. Simple, but `2+3×4` would give 20.
- **Trade-off:** an expression costs one HTTP call per operation. That's negligible for a
  calculator; a batch endpoint would be the next step if latency mattered.
- **400 vs 422:** 400 means the request itself is wrong; 422 means it is valid but the math is
  impossible. Clients can tell "fix your request" from "this has no answer".
- **`%` always means `/100`:** `200×10%` = 20, but `200+10%` = 200.1, unlike phone calculators
  that treat it as "10% of 200". The consistent rule is easier to reason about.
- **Numbers are IEEE-754 doubles** (`float64` / JS `number`). Results are shown with 15
  significant digits (the most decimal digits a double always preserves), so `0.1+0.2` shows
  `0.3`. Continuing from a result uses the full-precision value, so `1÷3`, then `×3`, gives `1`.
  Arbitrary precision is out of scope.
- **Validation on both layers:** the frontend rejects bad syntax and numbers too large to send
  (`1e999`) before calling the API. The backend still validates everything it receives, since
  other clients can call it.
- **Go standard library only:** `net/http` method routing (Go 1.22+) is enough for 8 routes.
- **No CORS:** in development Vite proxies `/api`; in Docker the Go server serves the built SPA from
  the same origin.
- **Docker image:** multi-stage build (Node → Go → distroless, non-root), about 15 MB.
- **TypeScript:** `strict`, no `any`, no `!` non-null assertions, no `as` casts. The linter
  (oxlint) enforces all three. Kinds are named with const-object enums (`DisplayKind.Result`),
  since the project's `erasableSyntaxOnly` setting doesn't allow TS `enum`.
- **Input limits:** expressions up to 200 characters; request bodies up to 1 KB.

## Project structure

```
backend/
  cmd/server/            entrypoint: config, graceful shutdown
  internal/calculator/   pure arithmetic + domain errors
  internal/api/          handlers, validation, error mapping, routing, request logging
frontend/src/
  types.ts               shared domain types and enums
  api/                   typed API client
  expression/            tokenizer → parser → evaluator
  calculator/            input state hook, result formatting, error messages
  components/            Calculator, Display, Keypad, keyboard mapping
docs/                    design spec and implementation plan
Dockerfile, docker-compose.yml, Makefile, .github/workflows/ci.yml
PROMPTS.md               prompts used with the AI assistant
```
