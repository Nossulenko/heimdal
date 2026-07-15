"use client";

import { Hash, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { CostChart } from "@/components/charts";
import { PageContainer, PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Card } from "@/components/ui/card";
import { TD, Table, TH, THead, TR } from "@/components/ui/table";
import { rangeForDays } from "@/lib/dates";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/format";
import { useBalance, useUsage } from "@/lib/hooks";

function StatCard({
	label,
	value,
	sub,
	icon,
}: {
	label: string;
	value: string;
	sub?: string;
	icon: ReactNode;
}) {
	return (
		<Card className="p-5">
			<div className="flex items-center justify-between">
				<span className="text-sm text-gray-500">{label}</span>
				<span className="text-gray-300">{icon}</span>
			</div>
			<div className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
				{value}
			</div>
			<div className="mt-1 min-h-4 text-xs text-gray-400">{sub ?? ""}</div>
		</Card>
	);
}

export default function OverviewPage() {
	const range = useMemo(() => rangeForDays(30), []);
	const balance = useBalance();
	const usage = useUsage(range.from, range.to);

	const topModels = useMemo(() => {
		if (!usage.data) return [];
		return [...usage.data.byModel]
			.sort((a, b) => b.costMicroUsd - a.costMicroUsd)
			.slice(0, 5);
	}, [usage.data]);

	return (
		<>
			<PageHeader
				icon="🏠"
				title="Overview"
				description="A snapshot of your gateway spend and usage over the last 30 days."
			/>
			<PageContainer>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<StatCard
						label="Balance"
						icon={<Wallet className="h-4 w-4" />}
						value={
							balance.data
								? formatUsd(balance.data.amountMicroUsd, 2)
								: balance.isError
									? "—"
									: "…"
						}
						sub={
							balance.data
								? `Updated ${formatDateTime(balance.data.updatedAt)}`
								: undefined
						}
					/>
					<StatCard
						label="Spend · 30d"
						icon={<TrendingUp className="h-4 w-4" />}
						value={
							usage.data
								? formatUsd(usage.data.totalCostMicroUsd)
								: usage.isError
									? "—"
									: "…"
						}
					/>
					<StatCard
						label="Tokens · 30d"
						icon={<Hash className="h-4 w-4" />}
						value={
							usage.data
								? formatNumber(usage.data.totalTokens)
								: usage.isError
									? "—"
									: "…"
						}
					/>
				</div>

				<section className="mt-8">
					<h2 className="mb-3 text-sm font-medium text-gray-700">Daily cost</h2>
					{usage.isLoading ? (
						<LoadingState />
					) : usage.isError ? (
						<ErrorState error={usage.error} />
					) : usage.data && usage.data.series.length > 0 ? (
						<Card className="p-4">
							<CostChart series={usage.data.series} />
						</Card>
					) : (
						<EmptyState
							title="No usage yet"
							description="Once you start sending requests through the gateway, your daily cost will appear here."
						/>
					)}
				</section>

				<section className="mt-8">
					<h2 className="mb-3 text-sm font-medium text-gray-700">
						Top models by spend
					</h2>
					{usage.isLoading ? (
						<LoadingState />
					) : usage.isError ? (
						<ErrorState error={usage.error} />
					) : topModels.length > 0 ? (
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
								{topModels.map((m) => (
									<TR key={m.logicalModel}>
										<TD className="font-medium text-gray-800">
											{m.logicalModel}
										</TD>
										<TD className="text-right">{formatNumber(m.requests)}</TD>
										<TD className="text-right">{formatNumber(m.tokens)}</TD>
										<TD className="text-right">{formatUsd(m.costMicroUsd)}</TD>
									</TR>
								))}
							</tbody>
						</Table>
					) : (
						<EmptyState
							title="No model activity"
							description="Model-level spend will show up here after your first requests."
						/>
					)}
				</section>
			</PageContainer>
		</>
	);
}
