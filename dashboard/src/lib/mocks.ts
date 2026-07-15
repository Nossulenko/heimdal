import type {
	ApiKey,
	Balance,
	CreatedApiKey,
	CreatedCredential,
	Credential,
	LoginResponse,
	Model,
	RecentMessage,
	Usage,
	UsageByModel,
	UsageSeriesPoint,
} from "./api";

function delay<T>(value: T, ms = 250): Promise<T> {
	return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

let idCounter = 2000;
function nextId(prefix: string): string {
	idCounter += 1;
	return `${prefix}_${idCounter}`;
}

function randomSuffix(len = 4): string {
	return Math.random()
		.toString(36)
		.slice(2, 2 + len);
}

function daysAgoIso(n: number): string {
	return new Date(Date.now() - n * 864e5).toISOString();
}

let keys: ApiKey[] = [
	{
		id: "key_1",
		name: "production",
		keyPrefix: "rl_live_a1b2",
		lastUsedAt: daysAgoIso(0),
		createdAt: daysAgoIso(48),
		revokedAt: null,
	},
	{
		id: "key_2",
		name: "staging",
		keyPrefix: "rl_live_c3d4",
		lastUsedAt: daysAgoIso(3),
		createdAt: daysAgoIso(30),
		revokedAt: null,
	},
	{
		id: "key_3",
		name: "local-dev",
		keyPrefix: "rl_test_e5f6",
		lastUsedAt: null,
		createdAt: daysAgoIso(12),
		revokedAt: null,
	},
];

let credentials: Credential[] = [
	{
		id: "cred_1",
		provider: "openai",
		createdAt: daysAgoIso(60),
		revokedAt: null,
	},
	{
		id: "cred_2",
		provider: "anthropic",
		createdAt: daysAgoIso(22),
		revokedAt: null,
	},
];

const models: Model[] = [
	{
		logicalName: "gpt-5",
		provider: "openai",
		providerModelId: "gpt-5",
		inputPricePerToken: 1.25e-6,
		outputPricePerToken: 1e-5,
		active: true,
	},
	{
		logicalName: "gpt-5-mini",
		provider: "openai",
		providerModelId: "gpt-5-mini",
		inputPricePerToken: 2.5e-7,
		outputPricePerToken: 2e-6,
		active: true,
	},
	{
		logicalName: "claude-sonnet-4.5",
		provider: "anthropic",
		providerModelId: "claude-sonnet-4-5",
		inputPricePerToken: 3e-6,
		outputPricePerToken: 1.5e-5,
		active: true,
	},
	{
		logicalName: "claude-haiku-4.5",
		provider: "anthropic",
		providerModelId: "claude-haiku-4-5",
		inputPricePerToken: 8e-7,
		outputPricePerToken: 4e-6,
		active: true,
	},
	{
		logicalName: "gemini-2.5-pro",
		provider: "google",
		providerModelId: "gemini-2.5-pro",
		inputPricePerToken: 1.25e-6,
		outputPricePerToken: 1e-5,
		active: true,
	},
	{
		logicalName: "gemini-2.5-flash",
		provider: "google",
		providerModelId: "gemini-2.5-flash",
		inputPricePerToken: 3e-7,
		outputPricePerToken: 2.5e-6,
		active: true,
	},
	{
		logicalName: "gpt-4o",
		provider: "openai",
		providerModelId: "gpt-4o-2024-11-20",
		inputPricePerToken: 2.5e-6,
		outputPricePerToken: 1e-5,
		active: false,
	},
];

export function login(email: string, _password: string): Promise<LoginResponse> {
	const handle = email.includes("@") ? email.split("@")[0] : email;
	const name = handle
		? handle.charAt(0).toUpperCase() + handle.slice(1)
		: "Acme AI";
	return delay({
		token: "mock-session-token",
		org: { id: "org_mock", name: `${name} Workspace` },
	});
}

export function getKeys(): Promise<ApiKey[]> {
	return delay([...keys]);
}

export function createKey(name: string): Promise<CreatedApiKey> {
	const id = nextId("key");
	const keyPrefix = `rl_live_${randomSuffix()}`;
	const created: ApiKey = {
		id,
		name,
		keyPrefix,
		lastUsedAt: null,
		createdAt: new Date().toISOString(),
		revokedAt: null,
	};
	keys = [created, ...keys];
	const plaintext = `${keyPrefix}${randomSuffix(12)}${randomSuffix(12)}`;
	return delay({ id, name, keyPrefix, plaintext });
}

export async function deleteKey(id: string): Promise<void> {
	keys = keys.filter((k) => k.id !== id);
	await delay(null);
}

export function getModels(): Promise<Model[]> {
	return delay([...models]);
}

export function getCredentials(): Promise<Credential[]> {
	return delay([...credentials]);
}

export function createCredential(
	provider: string,
	_apiKey: string,
): Promise<CreatedCredential> {
	const id = nextId("cred");
	credentials = [
		{ id, provider, createdAt: new Date().toISOString(), revokedAt: null },
		...credentials,
	];
	return delay({ id, provider });
}

export async function deleteCredential(id: string): Promise<void> {
	credentials = credentials.filter((c) => c.id !== id);
	await delay(null);
}

export function getUsage(from: string, to: string): Promise<Usage> {
	const cursor = new Date(from);
	cursor.setHours(0, 0, 0, 0);
	const last = new Date(to);
	last.setHours(0, 0, 0, 0);

	const series: UsageSeriesPoint[] = [];
	let totalCost = 0;
	let totalTokens = 0;
	let totalRequests = 0;
	let i = 0;

	while (cursor <= last && i < 400) {
		const wave = 0.6 + 0.4 * Math.sin(i / 3.2);
		const promptTokens = Math.round((30000 + Math.random() * 40000) * wave);
		const completionTokens = Math.round(
			(15000 + Math.random() * 25000) * wave,
		);
		const costMicroUsd = Math.round(promptTokens * 1.25 + completionTokens * 10);
		const requests = Math.max(
			1,
			Math.round((promptTokens + completionTokens) / 1500),
		);
		series.push({
			date: cursor.toISOString().slice(0, 10),
			requests,
			costMicroUsd,
			promptTokens,
			completionTokens,
		});
		totalCost += costMicroUsd;
		totalTokens += promptTokens + completionTokens;
		totalRequests += requests;
		cursor.setDate(cursor.getDate() + 1);
		i += 1;
	}

	const splits = [
		{ logicalModel: "gpt-5", cost: 0.4, req: 0.34 },
		{ logicalModel: "claude-sonnet-4.5", cost: 0.3, req: 0.24 },
		{ logicalModel: "gemini-2.5-pro", cost: 0.18, req: 0.19 },
		{ logicalModel: "gpt-5-mini", cost: 0.08, req: 0.16 },
		{ logicalModel: "claude-haiku-4.5", cost: 0.04, req: 0.07 },
	];
	const byModel: UsageByModel[] = splits.map((s) => ({
		logicalModel: s.logicalModel,
		costMicroUsd: Math.round(totalCost * s.cost),
		tokens: Math.round(totalTokens * s.cost),
		requests: Math.round(totalRequests * s.req),
	}));

	return delay(
		{
			totalRequests,
			totalCostMicroUsd: totalCost,
			totalSavingsMicroUsd: Math.round(totalCost * 0.62),
			totalTokens,
			series,
			byModel,
		},
		300,
	);
}

const RECENT_MODELS = [
	{ m: "gpt-5", p: "openai" },
	{ m: "claude-sonnet-4.5", p: "anthropic" },
	{ m: "gemini-2.5-pro", p: "google" },
	{ m: "auto", p: "openai" },
	{ m: "gpt-5-mini", p: "cache" },
];
const RECENT_PROMPTS = [
	"Generate stock report",
	"Summarize support thread",
	"Draft release notes",
	"Classify incoming ticket",
	"Write unit tests",
	"Translate onboarding email",
];

export function getRecentUsage(limit = 20): Promise<RecentMessage[]> {
	const out: RecentMessage[] = [];
	for (let i = 0; i < limit; i += 1) {
		const model = RECENT_MODELS[i % RECENT_MODELS.length];
		const promptTokens = 400 + Math.round(Math.random() * 6000);
		const completionTokens = 100 + Math.round(Math.random() * 3000);
		const cached = model.p === "cache";
		const cost = cached
			? 0
			: Math.round(promptTokens * 1.25 + completionTokens * 10);
		out.push({
			id: `msg_${i}`,
			logicalModel: model.m,
			provider: model.p,
			promptTokens,
			completionTokens,
			tokens: promptTokens + completionTokens,
			costMicroUsd: cost,
			savingsMicroUsd: cached
				? Math.round(promptTokens * 1.25 + completionTokens * 10)
				: 0,
			status: cached ? "cache_hit" : "success",
			createdAt: new Date(Date.now() - i * 137000).toISOString(),
		});
	}
	return delay(out, 250);
}

export function getBalance(): Promise<Balance> {
	return delay({ amountMicroUsd: 42_137_500, updatedAt: new Date().toISOString() });
}
