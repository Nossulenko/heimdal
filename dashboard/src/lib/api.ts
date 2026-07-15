import { getToken } from "./auth";
import * as mock from "./mocks";

export const API_URL =
	process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export interface Org {
	id: string;
	name: string;
}

export interface LoginResponse {
	token: string;
	org: Org;
}

export interface ApiKey {
	id: string;
	name: string;
	keyPrefix: string;
	lastUsedAt: string | null;
	createdAt: string;
	revokedAt: string | null;
}

export interface CreatedApiKey {
	id: string;
	name: string;
	keyPrefix: string;
	plaintext: string;
}

export interface Model {
	logicalName: string;
	provider: string;
	providerModelId: string;
	inputPricePerToken: number;
	outputPricePerToken: number;
	active: boolean;
}

export interface Credential {
	id: string;
	provider: string;
	createdAt: string;
	revokedAt: string | null;
}

export interface CreatedCredential {
	id: string;
	provider: string;
}

export interface UsageSeriesPoint {
	date: string;
	costMicroUsd: number;
	promptTokens: number;
	completionTokens: number;
}

export interface UsageByModel {
	logicalModel: string;
	costMicroUsd: number;
	tokens: number;
	requests: number;
}

export interface Usage {
	totalCostMicroUsd: number;
	totalTokens: number;
	series: UsageSeriesPoint[];
	byModel: UsageByModel[];
}

export interface Balance {
	amountMicroUsd: number;
	updatedAt: string;
}

export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

interface RequestOptions {
	method?: string;
	body?: unknown;
	auth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
	const { method = "GET", body, auth = true } = opts;
	const headers: Record<string, string> = {};
	if (body !== undefined) headers["Content-Type"] = "application/json";
	if (auth) {
		const token = getToken();
		if (token) headers["Authorization"] = `Bearer ${token}`;
	}

	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
			cache: "no-store",
		});
	} catch {
		throw new ApiError(0, "Unable to reach the API. Is the backend running?");
	}

	if (res.status === 204) return undefined as T;

	if (!res.ok) {
		let message = `Request failed (${res.status})`;
		try {
			const data: unknown = await res.json();
			if (data && typeof data === "object" && "error" in data) {
				const err = (data as { error?: unknown }).error;
				if (typeof err === "string") message = err;
			}
		} catch {
			// response body was not JSON; keep the default message
		}
		throw new ApiError(res.status, message);
	}

	return (await res.json()) as T;
}

export const api = {
	login(email: string, password: string): Promise<LoginResponse> {
		if (USE_MOCKS) return mock.login(email, password);
		return request<LoginResponse>("/api/auth/login", {
			method: "POST",
			body: { email, password },
			auth: false,
		});
	},

	getKeys(): Promise<ApiKey[]> {
		if (USE_MOCKS) return mock.getKeys();
		return request<ApiKey[]>("/api/keys");
	},

	createKey(name: string): Promise<CreatedApiKey> {
		if (USE_MOCKS) return mock.createKey(name);
		return request<CreatedApiKey>("/api/keys", {
			method: "POST",
			body: { name },
		});
	},

	async deleteKey(id: string): Promise<void> {
		if (USE_MOCKS) return mock.deleteKey(id);
		await request<void>(`/api/keys/${id}`, { method: "DELETE" });
	},

	getModels(): Promise<Model[]> {
		if (USE_MOCKS) return mock.getModels();
		return request<Model[]>("/api/models");
	},

	getCredentials(): Promise<Credential[]> {
		if (USE_MOCKS) return mock.getCredentials();
		return request<Credential[]>("/api/credentials");
	},

	createCredential(provider: string, apiKey: string): Promise<CreatedCredential> {
		if (USE_MOCKS) return mock.createCredential(provider, apiKey);
		return request<CreatedCredential>("/api/credentials", {
			method: "POST",
			body: { provider, apiKey },
		});
	},

	async deleteCredential(id: string): Promise<void> {
		if (USE_MOCKS) return mock.deleteCredential(id);
		await request<void>(`/api/credentials/${id}`, { method: "DELETE" });
	},

	getUsage(from: string, to: string): Promise<Usage> {
		if (USE_MOCKS) return mock.getUsage(from, to);
		const params = new URLSearchParams({ from, to });
		return request<Usage>(`/api/usage?${params.toString()}`);
	},

	getBalance(): Promise<Balance> {
		if (USE_MOCKS) return mock.getBalance();
		return request<Balance>("/api/balance");
	},
};
