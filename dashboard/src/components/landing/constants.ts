/**
 * Shared constants for the public landing page. Keeping the outbound links and
 * the monospace stack in one place avoids drift between the nav, hero, footer
 * and CTA sections.
 */
export const GITHUB_URL = "https://github.com/Nossulenko/heimdal";
export const DOCS_URL =
	"https://github.com/Nossulenko/heimdal/blob/main/docs/DESIGN.md";

export const MONO =
	'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

/** Provider keys understood by <ProviderLogo /> / providerLabel(). */
export const PROVIDERS = ["openai", "anthropic", "google"] as const;
