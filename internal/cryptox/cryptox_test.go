package cryptox

import (
	"bytes"
	"strings"
	"testing"
)

func testKey() []byte {
	k := make([]byte, 32)
	for i := range k {
		k[i] = byte(i)
	}
	return k
}

func TestGenerateAPIKey(t *testing.T) {
	pt, prefix, err := GenerateAPIKey()
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(pt, APIKeyPrefix) {
		t.Errorf("plaintext %q missing prefix %q", pt, APIKeyPrefix)
	}
	if prefix != pt[:DisplayPrefixLen] {
		t.Errorf("display prefix %q does not match key start", prefix)
	}
	pt2, _, _ := GenerateAPIKey()
	if pt == pt2 {
		t.Error("two generated keys are identical")
	}
}

func TestHashAPIKey(t *testing.T) {
	pepper := []byte("test-pepper-000000")
	h1 := HashAPIKey(pepper, "rlg_abc")
	h2 := HashAPIKey(pepper, "rlg_abc")
	if h1 != h2 {
		t.Error("hash is not deterministic")
	}
	if HashAPIKey(pepper, "rlg_xyz") == h1 {
		t.Error("different keys hash the same")
	}
	if HashAPIKey([]byte("other-pepper-00000"), "rlg_abc") == h1 {
		t.Error("different peppers hash the same")
	}
}

func TestEncryptDecryptRoundTrip(t *testing.T) {
	key := testKey()
	plaintext := []byte("sk-super-secret-upstream-key")
	ct, nonce, err := Encrypt(key, plaintext)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Equal(ct, plaintext) {
		t.Error("ciphertext equals plaintext")
	}
	got, err := Decrypt(key, ct, nonce)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, plaintext) {
		t.Errorf("round trip mismatch: got %q", got)
	}
}

func TestDecryptWrongKeyFails(t *testing.T) {
	ct, nonce, _ := Encrypt(testKey(), []byte("secret"))
	wrong := testKey()
	wrong[0] ^= 0xff
	if _, err := Decrypt(wrong, ct, nonce); err == nil {
		t.Error("expected decryption with wrong key to fail")
	}
}

func TestEncryptRejectsBadKeyLength(t *testing.T) {
	if _, _, err := Encrypt([]byte("short"), []byte("x")); err == nil {
		t.Error("expected error for short key")
	}
}

func TestPasswordHashing(t *testing.T) {
	hash, err := HashPassword("hunter2")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPassword(hash, "hunter2") {
		t.Error("correct password rejected")
	}
	if CheckPassword(hash, "wrong") {
		t.Error("wrong password accepted")
	}
}
