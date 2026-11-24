.PHONY: test test-backend test-frontend coverage run-backend run-frontend docker-up lint

test: test-backend test-frontend

test-backend:
	cd backend && go test -race ./...

test-frontend:
	cd frontend && npm test

coverage:
	cd backend && go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out && go tool cover -html=coverage.out -o coverage.html
	cd frontend && npm run test:coverage

lint:
	cd backend && test -z "$$(gofmt -l .)" && go vet ./...
	cd frontend && npm run lint && npm run format:check

run-backend:
	cd backend && go run ./cmd/server

run-frontend:
	cd frontend && npm run dev

docker-up:
	docker compose up --build
