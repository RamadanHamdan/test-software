// Package repository mengabstraksi akses data entity.
package repository

import (
	"context"
	"errors"

	"geo-entities/internal/entity"
)

var ErrNotFound = errors.New("entity not found")

type ListFilter struct {
	Type   entity.Type
	Status entity.Status
	Query  string // pencarian nama (case-insensitive, substring)
}

// Repository diimplementasikan oleh Postgres (produksi) dan fake (test handler).
// Input yang diterima sudah tervalidasi oleh lapisan handler.
type Repository interface {
	List(ctx context.Context, f ListFilter) ([]entity.Entity, error)
	Get(ctx context.Context, id string) (entity.Entity, error)
	Create(ctx context.Context, in entity.Input) (entity.Entity, error)
	Update(ctx context.Context, id string, in entity.Input) (entity.Entity, error)
	Delete(ctx context.Context, id string) error
}
