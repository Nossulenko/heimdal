// Package migrations embeds the SQL migration files so they ship inside the
// binary and can be applied without the source tree present.
package migrations

import "embed"

// FS holds the embedded goose-format migration files.
//
//go:embed *.sql
var FS embed.FS
