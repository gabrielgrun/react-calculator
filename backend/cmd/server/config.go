package main

type config struct {
	Port      string
	StaticDir string
}

func loadConfig(getenv func(string) string) config {
	port := getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return config{Port: port, StaticDir: getenv("STATIC_DIR")}
}
