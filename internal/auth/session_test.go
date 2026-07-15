package auth

import (
	"testing"
	"time"
)

func TestSessionRoundTrip(t *testing.T) {
	secret := []byte("session-secret-key")
	now := time.Unix(1_000_000, 0)
	tok, err := IssueSession(secret, Session{UserID: "u1", OrgID: "o1", ExpiresAt: now.Add(time.Hour).Unix()})
	if err != nil {
		t.Fatal(err)
	}
	sess, err := VerifySession(secret, tok, now)
	if err != nil {
		t.Fatal(err)
	}
	if sess.UserID != "u1" || sess.OrgID != "o1" {
		t.Errorf("claims = %+v", sess)
	}
}

func TestSessionExpired(t *testing.T) {
	secret := []byte("session-secret-key")
	now := time.Unix(1_000_000, 0)
	tok, _ := IssueSession(secret, Session{UserID: "u1", OrgID: "o1", ExpiresAt: now.Unix()})
	if _, err := VerifySession(secret, tok, now.Add(time.Second)); err == nil {
		t.Error("expected expired session to be rejected")
	}
}

func TestSessionTampered(t *testing.T) {
	secret := []byte("session-secret-key")
	now := time.Unix(1_000_000, 0)
	tok, _ := IssueSession(secret, Session{UserID: "u1", OrgID: "o1", ExpiresAt: now.Add(time.Hour).Unix()})
	if _, err := VerifySession(secret, tok+"x", now); err == nil {
		t.Error("expected tampered token to be rejected")
	}
	if _, err := VerifySession([]byte("wrong-secret-key"), tok, now); err == nil {
		t.Error("expected wrong secret to be rejected")
	}
}
