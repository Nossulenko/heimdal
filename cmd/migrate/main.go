// Command migrate applies database migrations. Usage: migrate [up|down|status].
package main

import (
	"log"
	"os"

	"github.com/nossulenko/heimdal/internal/migrate"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	cmd := "up"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}
	if err := migrate.Run(cmd, databaseURL); err != nil {
		log.Fatalf("migrate %s failed: %v", cmd, err)
	}
}
