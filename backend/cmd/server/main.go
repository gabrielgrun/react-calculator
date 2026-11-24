package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gabrielgrun/react-calculator/backend/internal/api"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger, loadConfig(os.Getenv)); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger, cfg config) error {
	var static http.Handler
	if cfg.StaticDir != "" {
		static = http.FileServer(http.Dir(cfg.StaticDir))
	}
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           api.NewRouter(logger, static),
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	listenErr := make(chan error, 1)
	go func() {
		logger.Info("server listening", "addr", server.Addr, "staticDir", cfg.StaticDir)
		listenErr <- server.ListenAndServe()
	}()

	select {
	case err := <-listenErr:
		return err
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if err := <-listenErr; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	logger.Info("server stopped gracefully")
	return nil
}
