package main

import (
	"context"
	"log/slog"
	"testing"
	"time"
)

func TestRun_StopsGracefullyWhenContextIsCancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- run(ctx, slog.New(slog.DiscardHandler), config{Port: "0"}) }()

	time.Sleep(100 * time.Millisecond)
	cancel()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("run() = %v, want nil", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("run() did not stop after the context was cancelled")
	}
}

func TestRun_ReturnsListenErrors(t *testing.T) {
	err := run(context.Background(), slog.New(slog.DiscardHandler), config{Port: "not-a-port"})
	if err == nil {
		t.Fatal("run() = nil, want a listen error")
	}
}
