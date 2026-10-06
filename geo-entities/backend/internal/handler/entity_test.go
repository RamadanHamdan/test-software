package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"geo-entities/internal/entity"
	"geo-entities/internal/handler"
	"geo-entities/internal/repository"
)

// fakeRepo cukup untuk menguji lapisan HTTP tanpa database.
type fakeRepo struct{}

func (fakeRepo) List(context.Context, repository.ListFilter) ([]entity.Entity, error) {
	return []entity.Entity{}, nil
}
func (fakeRepo) Get(context.Context, string) (entity.Entity, error) {
	return entity.Entity{}, repository.ErrNotFound
}
func (fakeRepo) Create(_ context.Context, in entity.Input) (entity.Entity, error) {
	return entity.Entity{
		ID: "00000000-0000-0000-0000-000000000001", Name: in.Name, Type: in.Type,
		Status: in.Status, Latitude: *in.Latitude, Longitude: *in.Longitude,
	}, nil
}
func (fakeRepo) Update(context.Context, string, entity.Input) (entity.Entity, error) {
	return entity.Entity{}, repository.ErrNotFound
}
func (fakeRepo) Delete(context.Context, string) error { return repository.ErrNotFound }

func do(method, path, body string) *httptest.ResponseRecorder {
	h := handler.NewEntityHandler(fakeRepo{}).Routes()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestCreate(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{"valid", `{"name":"Truk 01","type":"vehicle","status":"active","latitude":-6.9,"longitude":107.6}`, 201},
		{"koordinat 0,0 itu valid", `{"name":"X","type":"other","status":"active","latitude":0,"longitude":0}`, 201},
		{"latitude > 90", `{"name":"X","type":"other","status":"active","latitude":91,"longitude":0}`, 422},
		{"longitude < -180", `{"name":"X","type":"other","status":"active","latitude":0,"longitude":-181}`, 422},
		{"latitude tidak dikirim", `{"name":"X","type":"other","status":"active","longitude":0}`, 422},
		{"type tidak dikenal", `{"name":"X","type":"rocket","status":"active","latitude":0,"longitude":0}`, 422},
		{"status kosong", `{"name":"X","type":"other","latitude":0,"longitude":0}`, 422},
		{"nama hanya spasi", `{"name":"   ","type":"other","status":"active","latitude":0,"longitude":0}`, 422},
		{"field asing", `{"name":"X","type":"other","status":"active","latitude":0,"longitude":0,"foo":1}`, 400},
		{"JSON rusak", `{`, 400},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := do(http.MethodPost, "/", tc.body).Code; got != tc.want {
				t.Fatalf("status = %d, want %d", got, tc.want)
			}
		})
	}
}

func TestGet(t *testing.T) {
	if got := do(http.MethodGet, "/bukan-uuid", "").Code; got != 400 {
		t.Errorf("id invalid: status = %d, want 400", got)
	}
	if got := do(http.MethodGet, "/00000000-0000-0000-0000-000000000099", "").Code; got != 404 {
		t.Errorf("id tidak ada: status = %d, want 404", got)
	}
}

func TestListRejectsUnknownFilter(t *testing.T) {
	if got := do(http.MethodGet, "/?type=rocket", "").Code; got != 400 {
		t.Errorf("status = %d, want 400", got)
	}
}
