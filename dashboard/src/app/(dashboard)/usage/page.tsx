"use client";

import { useMemo, useState } from "react";
import { CostChart, TokensChart } from "@/components/charts";
import { PageContainer, PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Card } from "@/components/ui/card";
import { TD, Table, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { rangeForDays } from "@/lib/dates";
import { formatNumber, formatUsd } from "@/lib/format";
import { useUsage } from "@/lib/hooks";

const PRESETS = [
	{ label: "7 days", days: 7 },
	{ label: "30 days", days: 30 },
	{ label: "90 days", days: 90 },
] as const;

function RangeSelector({
	days,
	onChange,
}: {
	days: number;
	onChange: (days: number) => void;
}) {
	return (
		<div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
			{PRESETS.map((p) => (
				<button
					key={p.days}
					type="button"
					onClick={() => onChange(p.days)}
					className={cn(
						"rounded px-3 py-1 text-sm transition-colors",
						days === p.days
							? "bg-gray-900 text-white"
							: "text-gray-600 hover:bg-gray-100",
					)}
				>
					{p.label}
				</button>
			))}
		</div>
	);
}

export default function UsagePage() {
	const [days, setDays] = useState(30);
	const range = useMemo(() => rangeForDays(days), [days]);
	const usage = useUsage(range.from, range.to);

	const byModel = useMemo(() => {
		if (!usage.data) return [];
		return [...usage.data.byModel].sort(
			(a, b) => b.costMicroUsd - a.costMicroUsd,
		);
	}, [usage.data]);

	const hasSeries = Boolean(usage.data && usage.data.series.length > 0);

	return (
		<>
			<PageHeader
				icon="📊"
				title="Usage"
				description="Track cost and token consumption across your gateway over time."
				actions={<RangeSelector days={days} onChange={setDays} />}
			/>
			<PageContainer>
				{usage.isLoading ? (
					<LoadingState />
				) : usage.isError ? (
					<ErrorState error={usage.error} />
				) : usage.data ? (
					<div className="space-y-8">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Card className="p-5">
								<span className="text-sm text-gray-500">
									Total spend · {days}d
								</span>
								<div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
									{formatUsd(usage.data.totalCostMicroUsd)}
								</div>
							</Card>
							<Card className="p-5">
								<span className="text-sm text-gray-500">
									Total tokens · {days}d
								</span>
								<div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
									{formatNumber(usage.data.totalTokens)}
								</div>
							</Card>
						</div>

						{hasSeries ? (
							<>
								<section>
									<h2 className="mb-3 text-sm font-medium text-gray-700">
										Daily cost
									</h2>
									<Card className="p-4">
										<CostChart series={usage.data.series} />
									</Card>
								</section>

								<section>
									<h2 className="mb-3 text-sm font-medium text-gray-700">
										Daily tokens
									</h2>
									<Card className="p-4">
										<TokensChart series={usage.data.series} />
										<div className="mt-3 flex items-center gap-4 px-1 text-xs text-gray-500">
											<span className="inline-flex items-center gap-1.5">
												<span className="h-2.5 w-2.5 rounded-sm bg-gray-900" />
												Prompt
											</span>
											<span className="inline-flex items-center gap-1.5">
												<span className="h-2.5 w-2.5 rounded-sm bg-gray-400" />
												Completion
											</span>
										</div>
									</Card>
								</section>
							</>
						) : (
							<EmptyState
								title="No usage in this range"
								description="Try a wider date range, or send some requests through the gateway."
							/>
						)}

						<section>
							<h2 className="mb-3 text-sm font-medium text-gray-700">
								By model
							</h2>
							{byModel.length > 0 ? (
								<Table>
									<THead>
										<tr>
											<TH>Model</TH>
											<TH className="text-right">Requests</TH>
											<TH className="text-right">Tokens</TH>
											<TH className="text-right">Spend</TH>
										</tr>
									</THead>
									<tbody>
										{byModel.map((m) => (
											<TR key={m.logicalModel}>
												<TD className="font-medium text-gray-800">
													{m.logicalModel}
												</TD>
												<TD className="text-right">
													{formatNumber(m.requests)}
												</TD>
												<TD className="text-right">{formatNumber(m.tokens)}</TD>
												<TD className="text-right">
													{formatUsd(m.costMicroUsd)}
												</TD>
											</TR>
										))}
									</tbody>
								</Table>
							) : (
								<EmptyState title="No model activity in this range" />
							)}
						</section>
					</div>
				) : null}
			</PageContainer>
		</>
	);
}
