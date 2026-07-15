const MICRO = 1_000_000;

export function microUsdToUsd(micro: number): number {
	return micro / MICRO;
}

export function formatUsd(micro: number, maxDecimals = 4): string {
	return microUsdToUsd(micro).toLocaleString("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: maxDecimals,
	});
}

/**
 * Price fields are USD-per-token. Multiplying by 1e6 gives USD per 1M tokens,
 * which is how providers publish pricing.
 */
export function formatPricePerMillion(pricePerToken: number): string {
	return (pricePerToken * MICRO).toLocaleString("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 4,
	});
}

export function formatNumber(n: number): string {
	return n.toLocaleString("en-US");
}

export function formatCompact(n: number): string {
	return n.toLocaleString("en-US", {
		notation: "compact",
		maximumFractionDigits: 1,
	});
}

export function formatDate(iso: string | null | undefined): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatShortDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
