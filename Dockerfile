# syntax=docker/dockerfile:1
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/gateway ./cmd/gateway \
 && CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate \
 && CGO_ENABLED=0 go build -o /out/seed ./cmd/seed

FROM alpine:3.20
RUN adduser -D -u 10001 relaygw
COPY --from=build /out/gateway /usr/local/bin/gateway
COPY --from=build /out/migrate /usr/local/bin/migrate
COPY --from=build /out/seed /usr/local/bin/seed
USER relaygw
EXPOSE 8080
ENTRYPOINT ["gateway"]
