# React Calculator

[![CI](https://github.com/gabrielgrun/react-calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielgrun/react-calculator/actions/workflows/ci.yml)

A full-stack calculator: a **React + TypeScript** single-page app that understands full expressions
(precedence, `()`, `[]`, `{}`), backed by a **Go** REST microservice that performs every arithmetic
operation.

Supports addition, subtraction, multiplication, division, exponentiation, square root and
percentage.

**Highlights**

- **Real expression engine:** a recursive-descent parser handles operator precedence,
  associativity and nested `()`, `[]`, `{}`, so `2×[3+(4−1)]` evaluates to `12`.
- **Every operation goes through the API:** the UI evaluates the expression tree node by node
  against the Go service, running independent branches in parallel.
- **Strict validation on both layers,** with a consistent JSON error contract and meaningful
  status codes.
- **Well tested:** 91% backend and 98.8% frontend coverage, enforced in CI alongside linting,
  formatting and a Docker smoke test.
- **One command to run:** `docker compose up --build` serves the UI and the API from a 15 MB
  distroless image.

## Quick start (Docker)

The only requirement is Docker.

```bash
docker compose up --build
```

Open **http://localhost:8080**. One container serves both the UI and the API.

## Development

Prerequisites: **Go 1.27+** and **Node.js 24+** (22.13+ also works).

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
| Backend — `internal/api` | HTTP tests through the real router (`httptest`) | 97.4% |
| Backend — `cmd/server` | configuration, startup and graceful shutdown | 67.9% |
| **Backend total** | | **91.1%** |
| Frontend (97 tests) | tokenizer, parser, evaluator, API client, state hook, components | **98.8%** (97.6% branches) |

Tests live next to the code they cover: `*_test.go` in the backend and `*.test.ts(x)` in the
frontend.

`npm run test:coverage` fails below 90% lines/functions/statements or 85% branches.

**Coverage reports online:** every [CI run](https://github.com/gabrielgrun/react-calculator/actions/workflows/ci.yml)
shows the backend and frontend coverage summaries on its page, and attaches the full HTML reports
as downloadable artifacts (`backend-coverage`, `frontend-coverage`).

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
| 404 | `not_found` | unknown endpoint under `/api/` |
| 405 | `method_not_allowed` | wrong HTTP method (the `Allow` header names the right one) |
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

## Input validation & error handling

Invalid input never crashes the app or reaches the API as a malformed request.

**Frontend** (shown in the display before any request is made):

- Syntax errors with a precise message: `Unexpected "*"`, `Missing closing ")"`,
  `Expected ")" but found "]"`, `Unexpected end of expression`.
- Invalid numbers (`1.2.3`), unknown characters, and numbers too large to represent (`1e999`).
- Expressions longer than 200 characters are blocked with a message.
- API errors become readable messages (`Cannot divide by zero`,
  `Cannot take the square root of a negative number`), and an unreachable server shows
  `Couldn't reach the server`.
- While a calculation is in flight the display shows `Calculating…`, the equals key is disabled,
  and repeated submits are ignored.

**Backend** (every request is validated independently of the UI):

- Body limited to 1 KB; unknown fields, wrong types and trailing data are rejected.
- A missing operand is distinguished from `0`.
- Division by zero, square roots of negative numbers, undefined results (`NaN`) and overflow
  (`±Inf`) are caught and returned as `422` with a specific error code.
- Unknown endpoints and wrong HTTP methods return JSON errors too, so clients always get the
  same error shape (see [API](#api)).

## How the expression engine works

Users type whole expressions such as `2×[3+(4−1)]`. The frontend turns the text into a tree and
asks the backend to compute each node, so the UI is built directly on the per-operation API.

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

- **A real expression engine is a correctness requirement, not an extra.** Once the UI accepts
  more than one operation, precedence has to be handled somewhere, and a pocket-calculator
  approach gives wrong answers like `2+3×4 = 20`. The parser is kept small (one function per
  precedence level) and fully tested.
- **The frontend parses, the backend computes.** I compared three approaches:
  - *(chosen)* The frontend builds the expression tree and calls one endpoint per operation. Each
    layer has a single responsibility: the frontend owns input syntax (brackets, precedence), the
    backend owns arithmetic and its edge cases, and every endpoint is a real dependency of the UI.
  - A single `/calculate` endpoint receiving the whole expression: fewer requests, but the
    per-operation endpoints would become unused API surface.
  - A pocket-calculator UI that computes after each key press: simpler, but it ignores operator
    precedence (`2+3×4` would give 20).
- **Request volume:** an expression costs one HTTP call per operation, with independent branches
  in parallel. If latency became a concern, a batch endpoint could evaluate a whole tree in one
  round-trip while keeping the same per-operation contract.
- **400 vs 422:** 400 means the request itself is wrong; 422 means it is valid but the math is
  impossible. Clients can tell "fix your request" from "this has no answer".
- **Percentage is a unary operator:** `x%` always evaluates to `x / 100`, so it composes
  predictably with every other operator (`200×10%` = 20). Context-dependent percentage, as some
  handheld calculators apply to `200+10%`, was left out to keep the grammar unambiguous.
- **Numbers are IEEE-754 doubles** (`float64` / JS `number`). Results are shown with 15
  significant digits (the most decimal digits a double always preserves), so `0.1+0.2` shows
  `0.3`. Continuing from a result uses the full-precision value, so `1÷3`, then `×3`, gives `1`.
- **Validation on both layers:** the frontend catches bad syntax and out-of-range numbers
  (`1e999`) before any request is made. The backend validates independently, so the API is safe
  for any client, not just this UI.
- **Go standard library only:** `net/http` method routing (Go 1.22+) covers every routing need
  with zero third-party dependencies.
- **No CORS:** in development Vite proxies `/api`; in Docker the Go server serves the built SPA from
  the same origin.
- **Docker image:** multi-stage build (Node → Go → distroless, non-root), about 15 MB.
- **TypeScript:** `strict`, with no `any`, no `!` non-null assertions and no `as` casts, all
  enforced by the linter (oxlint). Kinds are const-object enums (`DisplayKind.Result`) rather than
  TS `enum`, which keeps the code compatible with `erasableSyntaxOnly` and native type stripping.
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
Dockerfile, docker-compose.yml, Makefile, .github/workflows/ci.yml
PROMPTS.md               prompts used with the AI assistant
```
