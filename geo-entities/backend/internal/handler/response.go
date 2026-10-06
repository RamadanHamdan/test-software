package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

// errorBody adalah format error tunggal untuk seluruh API.
type errorBody struct {
	Error   string            `json:"error"`
	Message string            `json:"message,omitempty"`
	Details map[string]string `json:"details,omitempty"` // field -> pesan
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func writeError(w http.ResponseWriter, status int, code, msg string, details map[string]string) {
	writeJSON(w, status, errorBody{Error: code, Message: msg, Details: details})
}

const maxBodyBytes = 1 << 20 // 1 MiB

// decodeJSON membaca tepat satu objek JSON, menolak field asing dan body besar.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("body harus berisi satu objek JSON")
	}
	return nil
}
