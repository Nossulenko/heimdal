// Package cryptox holds the gateway's cryptographic primitives, chosen per the
// design decisions:
//
//   - API keys are high-entropy random tokens, so they are hashed with a single
//     fast HMAC-SHA-256 (keyed by a server-side pepper) rather than a slow
//     password KDF. This keeps per-request auth cheap and the hash indexable.
//   - Dashboard user passwords are low-entropy and are hashed with bcrypt.
//   - Provider credentials are encrypted at rest with AES-256-GCM using a key
//     supplied via config; a key_version is stored alongside to allow rotation.
package cryptox

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// APIKeyPrefix is the human-visible prefix of every generated key.
const APIKeyPrefix = "hmd_"

// DisplayPrefixLen is how many leading characters of a key are stored for
// display (e.g. "rlg_1a2b3c").
const DisplayPrefixLen = 10

// GenerateAPIKey returns a new random API key plaintext and its display prefix.
// The plaintext is shown to the user exactly once and never stored.
func GenerateAPIKey() (plaintext, prefix string, err error) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	plaintext = APIKeyPrefix + hex.EncodeToString(raw)
	prefix = plaintext[:DisplayPrefixLen]
	return plaintext, prefix, nil
}

// HashAPIKey returns the hex-encoded HMAC-SHA-256 of the key under the pepper.
// The same input always yields the same output, so the result can be looked up
// with an indexed equality query.
func HashAPIKey(pepper []byte, plaintext string) string {
	mac := hmac.New(sha256.New, pepper)
	mac.Write([]byte(plaintext))
	return hex.EncodeToString(mac.Sum(nil))
}

// HashPassword hashes a dashboard user password with bcrypt.
func HashPassword(password string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(h), nil
}

// CheckPassword reports whether password matches the bcrypt hash.
func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// ErrInvalidKeyLength is returned when the AES key is not 32 bytes.
var ErrInvalidKeyLength = errors.New("cryptox: encryption key must be 32 bytes")

// Encrypt seals plaintext with AES-256-GCM. It returns the ciphertext and the
// random nonce used; both must be stored to decrypt later.
func Encrypt(key, plaintext []byte) (ciphertext, nonce []byte, err error) {
	if len(key) != 32 {
		return nil, nil, ErrInvalidKeyLength
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, err
	}
	nonce = make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, nil, err
	}
	ciphertext = gcm.Seal(nil, nonce, plaintext, nil)
	return ciphertext, nonce, nil
}

// Decrypt opens an AES-256-GCM ciphertext produced by Encrypt.
func Decrypt(key, ciphertext, nonce []byte) ([]byte, error) {
	if len(key) != 32 {
		return nil, ErrInvalidKeyLength
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(nonce) != gcm.NonceSize() {
		return nil, fmt.Errorf("cryptox: invalid nonce size")
	}
	return gcm.Open(nil, nonce, ciphertext, nil)
}

// ConstantTimeEqual compares two strings without leaking timing information.
func ConstantTimeEqual(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
