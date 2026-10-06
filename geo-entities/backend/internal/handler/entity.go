// Package handler berisi HTTP handler (lapisan transport).
package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"reflect"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"geo-entities/internal/entity"
	"geo-entities/internal/repository"
)

type EntityHandler struct {
	repo     repository.Repository
	validate *validator.Validate
}

func NewEntityHandler(repo repository.Repository) *EntityHandler {
	v := validator.New()

	// Nama field di error = nama JSON ("latitude"), bukan nama field Go ("Latitude").
	v.RegisterTagNameFunc(func(f reflect.StructField) string {
		name := strings.SplitN(f.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})
	// Daftar nilai enum hanya didefinisikan sekali: di paket entity.
	_ = v.RegisterValidation("entity_type", func(fl validator.FieldLevel) bool {
		return entity.Type(fl.Field().String()).Valid()
	})
	_ = v.RegisterValidation("entity_status", func(fl validator.FieldLevel) bool {
		return entity.Status(fl.Field().String()).Valid()
	})

	return &EntityHandler{repo: repo, validate: v}
}

// Routes dipasang di /api/entities.
func (h *EntityHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{id}", h.Get)
	r.Put("/{id}", h.Update)
	r.Delete("/{id}", h.Delete)
	return r
}

// GET /api/entities?type=&status=&q=
func (h *EntityHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := repository.ListFilter{
		Type:   entity.Type(q.Get("type")),
		Status: entity.Status(q.Get("status")),
		Query:  strings.TrimSpace(q.Get("q")),
	}
	if f.Type != "" && !f.Type.Valid() {
		writeError(w, http.StatusBadRequest, "invalid_filter", "type tidak dikenal", nil)
		return
	}
	if f.Status != "" && !f.Status.Valid() {
		writeError(w, http.StatusBadRequest, "invalid_filter", "status tidak dikenal", nil)
		return
	}

	items, err := h.repo.List(r.Context(), f)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

// GET /api/entities/{id}
func (h *EntityHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	e, err := h.repo.Get(r.Context(), id)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, e)
}

// POST /api/entities
func (h *EntityHandler) Create(w http.ResponseWriter, r *http.Request) {
	in, ok := h.bind(w, r)
	if !ok {
		return
	}
	e, err := h.repo.Create(r.Context(), in)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	w.Header().Set("Location", "/api/entities/"+e.ID)
	writeJSON(w, http.StatusCreated, e)
}

// PUT /api/entities/{id}
// TODO(kamu): kerjakan sendiri, polanya sama dengan Get + Create:
//  1. parseID  2. h.bind  3. h.repo.Update  4. h.fail jika error  5. writeJSON 200
func (h *EntityHandler) Update(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "", nil)
}

// DELETE /api/entities/{id}
// TODO(kamu): parseID -> h.repo.Delete -> h.fail jika error -> 204 tanpa body.
func (h *EntityHandler) Delete(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "", nil)
}

// bind men-decode body lalu memvalidasinya. Jika gagal, response error sudah
// ditulis dan ok == false.
func (h *EntityHandler) bind(w http.ResponseWriter, r *http.Request) (in entity.Input, ok bool) {
	if err := decodeJSON(w, r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", err.Error(), nil)
		return in, false
	}
	in.Name = strings.TrimSpace(in.Name) // "   " harus gagal di `required`

	if err := h.validate.Struct(in); err != nil {
		var verrs validator.ValidationErrors
		if errors.As(err, &verrs) {
			details := make(map[string]string, len(verrs))
			for _, fe := range verrs {
				details[fe.Field()] = message(fe)
			}
			writeError(w, http.StatusUnprocessableEntity, "validation_failed", "input tidak valid", details)
			return in, false
		}
		h.fail(w, r, err)
		return in, false
	}
	return in, true
}

func parseID(w http.ResponseWriter, r *http.Request) (string, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "id harus berupa UUID", nil)
		return "", false
	}
	return id.String(), true
}

// fail memetakan error repository ke response HTTP.
func (h *EntityHandler) fail(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "entity tidak ditemukan", nil)
		return
	}
	slog.ErrorContext(r.Context(), "request gagal", "err", err, "method", r.Method, "path", r.URL.Path)
	writeError(w, http.StatusInternalServerError, "internal_error", "terjadi kesalahan pada server", nil)
}

func message(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "wajib diisi"
	case "max":
		return "maksimal " + fe.Param() + " karakter"
	case "gte":
		return "tidak boleh kurang dari " + fe.Param()
	case "lte":
		return "tidak boleh lebih dari " + fe.Param()
	case "entity_type":
		return "tipe tidak dikenal (vehicle, iot_device, facility, other)"
	case "entity_status":
		return "status tidak dikenal (active, inactive, maintenance)"
	}
	return "nilai tidak valid"
}
