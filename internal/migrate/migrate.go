// Package migrate applies the embedded goose migrations against a Postgres
// database. It uses database/sql via the pgx stdlib driver, which is what goose
// expects.
package migrate

import (
	"database/sql"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/kaizenprojects/relaygw/migrations"
)

func open(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

// Up applies all pending migrations.
func Up(databaseURL string) error {
	db, err := open(databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()
	return goose.Up(db, ".")
}

// Down rolls back the most recent migration.
func Down(databaseURL string) error {
	db, err := open(databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()
	return goose.Down(db, ".")
}

// Status prints migration status.
func Status(databaseURL string) error {
	db, err := open(databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()
	return goose.Status(db, ".")
}

// Run dispatches a goose subcommand by name.
func Run(cmd, databaseURL string) error {
	switch cmd {
	case "up", "":
		return Up(databaseURL)
	case "down":
		return Down(databaseURL)
	case "status":
		return Status(databaseURL)
	default:
		return fmt.Errorf("unknown migrate command %q (use up|down|status)", cmd)
	}
}
