"use client";

const TOKEN_KEY = "relaygw_token";
const ORG_KEY = "relaygw_org";

export interface Org {
	id: string;
	name: string;
}

// In-memory mirror of the cookie for fast, synchronous access within a session.
let memToken: string | null = null;
let memOrg: Org | null = null;

function readCookie(name: string): string | null {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(
		new RegExp("(?:^|; )" + name + "=([^;]*)"),
	);
	return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days = 30): void {
	if (typeof document === "undefined") return;
	const expires = new Date(Date.now() + days * 864e5).toUTCString();
	document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
	if (typeof document === "undefined") return;
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getToken(): string | null {
	if (memToken) return memToken;
	memToken = readCookie(TOKEN_KEY);
	return memToken;
}

export function getOrg(): Org | null {
	if (memOrg) return memOrg;
	const raw = readCookie(ORG_KEY);
	if (!raw) return null;
	try {
		memOrg = JSON.parse(raw) as Org;
	} catch {
		memOrg = null;
	}
	return memOrg;
}

export function setSession(token: string, org: Org): void {
	memToken = token;
	memOrg = org;
	writeCookie(TOKEN_KEY, token);
	writeCookie(ORG_KEY, JSON.stringify(org));
}

export function clearSession(): void {
	memToken = null;
	memOrg = null;
	deleteCookie(TOKEN_KEY);
	deleteCookie(ORG_KEY);
}
