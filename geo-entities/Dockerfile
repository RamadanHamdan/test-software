# --- build ---
# Samakan dengan `go version` lokal / baris `go` di go.mod bila perlu.
ARG GO_VERSION=1.25
FROM golang:${GO_VERSION}-alpine AS build
# Image resmi golang memakai GOTOOLCHAIN=local; `auto` membolehkan Go mengunduh
# toolchain yang lebih baru jika go.mod memintanya.
ENV GOTOOLCHAIN=auto CGO_ENABLED=0
WORKDIR /src

# Salin go.mod/go.sum dulu agar lapisan download dependency ter-cache.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# --- runtime ---
FROM alpine:3
RUN adduser -D -u 10001 app
USER app
COPY --from=build /out/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
