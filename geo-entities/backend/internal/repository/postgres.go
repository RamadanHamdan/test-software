package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"geo-entities/internal/entity"
)

type Postgres struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) *Postgres { return &Postgres{pool: pool} }

const columns = `id::text, name, type, status, description, latitude, longitude, created_at, updated_at`

func scan(row pgx.Row) (entity.Entity, error) {
	var e entity.Entity
	err := row.Scan(&e.ID, &e.Name, &e.Type, &e.Status, &e.Description,
		&e.Latitude, &e.Longitude, &e.CreatedAt, &e.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return e, ErrNotFound
	}
	return e, err
}

var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

func (p *Postgres) List(ctx context.Context, f ListFilter) ([]entity.Entity, error) {
	var (
		where []string
		args  []any
	)
	add := func(cond string, v any) {
		args = append(args, v)
		where = append(where, fmt.Sprintf(cond, len(args)))
	}
	if f.Type != "" {
		add("type = $%d", string(f.Type))
	}
	if f.Status != "" {
		add("status = $%d", string(f.Status))
	}
	if f.Query != "" {
		add("name ILIKE $%d", "%"+likeEscaper.Replace(f.Query)+"%")
	}

	q := "SELECT " + columns + " FROM entities"
	if len(where) > 0 {
		q += " WHERE " + strings.Join(where, " AND ")
	}
	q += " ORDER BY created_at DESC"

	rows, err := p.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []entity.Entity{} // bukan nil, supaya JSON jadi [] bukan null
	for rows.Next() {
		e, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (p *Postgres) Get(ctx context.Context, id string) (entity.Entity, error) {
	return scan(p.pool.QueryRow(ctx,
		"SELECT "+columns+" FROM entities WHERE id = $1", id))
}

func (p *Postgres) Create(ctx context.Context, in entity.Input) (entity.Entity, error) {
	return scan(p.pool.QueryRow(ctx,
		`INSERT INTO entities (name, type, status, description, latitude, longitude)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING `+columns,
		in.Name, string(in.Type), string(in.Status), in.Description, *in.Latitude, *in.Longitude))
}

func (p *Postgres) Update(ctx context.Context, id string, in entity.Input) (entity.Entity, error) {
	return scan(p.pool.QueryRow(ctx,
		`UPDATE entities
		    SET name = $2, type = $3, status = $4, description = $5,
		        latitude = $6, longitude = $7, updated_at = now()
		  WHERE id = $1
		 RETURNING `+columns,
		id, in.Name, string(in.Type), string(in.Status), in.Description, *in.Latitude, *in.Longitude))
}

func (p *Postgres) Delete(ctx context.Context, id string) error {
	tag, err := p.pool.Exec(ctx, "DELETE FROM entities WHERE id = $1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
