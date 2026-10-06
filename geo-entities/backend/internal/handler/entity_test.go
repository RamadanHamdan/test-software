package handler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"geo-entities/internal/entity"
	"geo-entities/internal/handler"
	"geo-entities/internal/repository"
)

const (
	knownID   = "00000000-0000-0000-0000-000000000001" // dianggap ada oleh fakeRepo
	unknownID = "00000000-0000-0000-0000-000000000099" // dianggap tidak ada
)

// fakeRepo cukup untuk menguji lapisan HTTP tanpa database.
// Hanya knownID yang "ada"; id lain menghasilkan ErrNotFound.
type fakeRepo struct{}

func build(id string, in entity.Input) entity.Entity {
	return entity.Entity{
		ID: id, Name: in.Name, Type: in.Type, Status: in.Status, Description: in.Description,
		Latitude: *in.Latitude, Longitude: *in.Longitude,
	}
}

func (fakeRepo) List(context.Context, repository.ListFilter) ([]entity.Entity, error) {
	return []entity.Entity{}, nil
}

func (fakeRepo) Get(_ context.Context, id string) (entity.Entity, error) {
	if id != knownID {
		return entity.Entity{}, repository.ErrNotFound
	}
	return entity.Entity{ID: id, Name: "Truk 01", Type: entity.TypeVehicle, Status: entity.StatusActive}, nil
}

func (fakeRepo) Create(_ context.Context, in entity.Input) (entity.Entity, error) {
	return build(knownID, in), nil
}

func (fakeRepo) Update(_ context.Context, id string, in entity.Input) (entity.Entity, error) {
	if id != knownID {
		return entity.Entity{}, repository.ErrNotFound
	}
	return build(id, in), nil
}

func (fakeRepo) Delete(_ context.Context, id string) error {
	if id != knownID {
		return repository.ErrNotFound
	}
	return nil
}

func do(method, path, body string) *httptest.ResponseRecorder {
	h := handler.NewEntityHandler(fakeRepo{}).Routes()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

const validBody = `{"name":"Truk 01 (baru)","type":"vehicle","status":"maintenance","latitude":-6.9,"longitude":107.6}`

func TestCreate(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{"valid", validBody, 201},
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
	tests := []struct {
		name string
		path string
		want int
	}{
		{"ada", "/" + knownID, 200},
		{"tidak ada", "/" + unknownID, 404},
		{"id bukan UUID", "/bukan-uuid", 400},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := do(http.MethodGet, tc.path, "").Code; got != tc.want {
				t.Fatalf("status = %d, want %d", got, tc.want)
			}
		})
	}
}

func TestUpdate(t *testing.T) {
	tests := []struct {
		name string
		path string
		body string
		want int
	}{
		{"berhasil", "/" + knownID, validBody, 200},
		{"id tidak ada", "/" + unknownID, validBody, 404},
		{"id bukan UUID", "/abc", validBody, 400},
		{"latitude di luar rentang", "/" + knownID, `{"name":"X","type":"other","status":"active","latitude":100,"longitude":0}`, 422},
		{"PUT harus penuh, body parsial ditolak", "/" + knownID, `{"name":"X"}`, 422},
		{"JSON rusak", "/" + knownID, `{`, 400},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := do(http.MethodPut, tc.path, tc.body).Code; got != tc.want {
				t.Fatalf("status = %d, want %d", got, tc.want)
			}
		})
	}
}

func TestUpdateReturnsNewValues(t *testing.T) {
	rec := do(http.MethodPut, "/"+knownID, validBody)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var got entity.Entity
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("response bukan JSON entity: %v", err)
	}
	if got.Name != "Truk 01 (baru)" || got.Status != entity.StatusMaintenance {
		t.Errorf("response tidak mencerminkan input: %+v", got)
	}
}

func TestDelete(t *testing.T) {
	tests := []struct {
		name string
		path string
		want int
	}{
		{"berhasil", "/" + knownID, 204},
		{"tidak ada", "/" + unknownID, 404},
		{"id bukan UUID", "/abc", 400},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := do(http.MethodDelete, tc.path, "").Code; got != tc.want {
				t.Fatalf("status = %d, want %d", got, tc.want)
			}
		})
	}

	if n := do(http.MethodDelete, "/"+knownID, "").Body.Len(); n != 0 {
		t.Errorf("204 tidak boleh punya body, dapat %d byte", n)
	}
}

func TestListRejectsUnknownFilter(t *testing.T) {
	if got := do(http.MethodGet, "/?type=rocket", "").Code; got != 400 {
		t.Errorf("status = %d, want 400", got)
	}
}
