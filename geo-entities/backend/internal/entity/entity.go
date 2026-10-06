// Package entity berisi model domain dan aturan validasi input.
// Aturan di sini harus selaras dengan CHECK constraint di migrations/
// dan schema Zod di frontend.
package entity

import "time"

type Type string

const (
	TypeVehicle   Type = "vehicle"
	TypeIoTDevice Type = "iot_device"
	TypeFacility  Type = "facility"
	TypeOther     Type = "other"
)

func (t Type) Valid() bool {
	switch t {
	case TypeVehicle, TypeIoTDevice, TypeFacility, TypeOther:
		return true
	}
	return false
}

type Status string

const (
	StatusActive      Status = "active"
	StatusInactive    Status = "inactive"
	StatusMaintenance Status = "maintenance"
)

func (s Status) Valid() bool {
	switch s {
	case StatusActive, StatusInactive, StatusMaintenance:
		return true
	}
	return false
}

// Entity adalah representasi yang dikirim ke klien.
type Entity struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        Type      `json:"type"`
	Status      Status    `json:"status"`
	Description string    `json:"description"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Input dipakai untuk POST (create) dan PUT (update penuh).
//
// Latitude/Longitude berupa pointer supaya nilai 0 (valid: ekuator / meridian
// utama) bisa dibedakan dari field yang tidak dikirim. Setelah lolos validasi,
// keduanya dijamin tidak nil.
type Input struct {
	Name        string   `json:"name"        validate:"required,max=100"`
	Type        Type     `json:"type"        validate:"required,entity_type"`
	Status      Status   `json:"status"      validate:"required,entity_status"`
	Description string   `json:"description" validate:"max=500"`
	Latitude    *float64 `json:"latitude"    validate:"required,gte=-90,lte=90"`
	Longitude   *float64 `json:"longitude"   validate:"required,gte=-180,lte=180"`
}
