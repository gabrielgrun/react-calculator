package main

import "testing"

func fakeEnv(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestLoadConfig_Defaults(t *testing.T) {
	got := loadConfig(fakeEnv(nil))
	want := config{Port: "8080", StaticDir: ""}
	if got != want {
		t.Fatalf("loadConfig() = %+v, want %+v", got, want)
	}
}

func TestLoadConfig_FromEnvironment(t *testing.T) {
	got := loadConfig(fakeEnv(map[string]string{"PORT": "9090", "STATIC_DIR": "/web"}))
	want := config{Port: "9090", StaticDir: "/web"}
	if got != want {
		t.Fatalf("loadConfig() = %+v, want %+v", got, want)
	}
}
