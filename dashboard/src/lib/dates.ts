export interface DateRange {
	from: string;
	to: string;
}

/**
 * Returns an ISO range covering the last `days` calendar days (inclusive of
 * today). Callers should memoize the result so the value stays stable across
 * renders and does not thrash TanStack Query keys.
 */
export function rangeForDays(days: number): DateRange {
	const from = new Date();
	from.setHours(0, 0, 0, 0);
	from.setDate(from.getDate() - (days - 1));
	const to = new Date();
	to.setHours(23, 59, 59, 999);
	return { from: from.toISOString(), to: to.toISOString() };
}
