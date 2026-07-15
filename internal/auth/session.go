package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/nossulenko/heimdal/internal/cryptox"
)

// Session is the claims payload of a dashboard session token.
type Session struct {
	UserID    string `json:"uid"`
	OrgID     string `json:"org"`
	ExpiresAt int64  `json:"exp"`
}

// ErrInvalidSession is returned for malformed, tampered, or expired tokens.
var ErrInvalidSession = errors.New("auth: invalid session token")

var b64 = base64.RawURLEncoding

// IssueSession returns a signed, stateless session token of the form
// "<payload>.<hmac>". It carries its own claims; no server-side session store
// is needed.
func IssueSession(secret []byte, s Session) (string, error) {
	payload, err := json.Marshal(s)
	if err != nil {
		return "", err
	}
	body := b64.EncodeToString(payload)
	sig := sign(secret, body)
	return body + "." + sig, nil
}

// VerifySession validates a token's signature and expiry and returns its claims.
func VerifySession(secret []byte, token string, now time.Time) (*Session, error) {
	body, sig, ok := strings.Cut(token, ".")
	if !ok {
		return nil, ErrInvalidSession
	}
	if !cryptox.ConstantTimeEqual(sig, sign(secret, body)) {
		return nil, ErrInvalidSession
	}
	payload, err := b64.DecodeString(body)
	if err != nil {
		return nil, ErrInvalidSession
	}
	var s Session
	if err := json.Unmarshal(payload, &s); err != nil {
		return nil, ErrInvalidSession
	}
	if now.Unix() >= s.ExpiresAt {
		return nil, ErrInvalidSession
	}
	return &s, nil
}

func sign(secret []byte, body string) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(body))
	return b64.EncodeToString(mac.Sum(nil))
}
