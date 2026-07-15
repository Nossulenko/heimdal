"use client";

import Box from "@mui/material/Box";

const LOGO: Record<string, string> = {
	openai: "/logos/openai.svg",
	anthropic: "/logos/anthropic.svg",
	google: "/logos/gemini.svg",
};

const LABEL: Record<string, string> = {
	openai: "OpenAI",
	anthropic: "Anthropic",
	google: "Google Gemini",
};

/** providerLabel returns the display name for a provider key. */
export function providerLabel(provider: string): string {
	return LABEL[provider] ?? provider;
}

/** ProviderLogo renders the real brand mark for a provider, or nothing if unknown. */
export function ProviderLogo({
	provider,
	size = 18,
}: {
	provider: string;
	size?: number;
}) {
	const src = LOGO[provider];
	if (!src) return null;
	return (
		<Box
			component="img"
			src={src}
			alt={providerLabel(provider)}
			sx={{ width: size, height: size, display: "block", flexShrink: 0 }}
		/>
	);
}

/** ProviderTag renders the brand mark next to the provider's display name. */
export function ProviderTag({
	provider,
	size = 18,
}: {
	provider: string;
	size?: number;
}) {
	return (
		<Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
			<ProviderLogo provider={provider} size={size} />
			<span>{providerLabel(provider)}</span>
		</Box>
	);
}
