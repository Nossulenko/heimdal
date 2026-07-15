"use client";

import { useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TD, Table, TH, THead, TR } from "@/components/ui/table";
import { rangeForDays } from "@/lib/dates";
import { formatDateTime, formatUsd } from "@/lib/format";
import { useBalance, useUsage } from "@/lib/hooks";

export default function BillingPage() {
	const range = useMemo(() => rangeForDays(30), []);
	const balance = useBalance();
	const usage = useUsage(range.from, range.to);

	return (
		<>
			<PageHeader
				icon="💳"
				title="Billing"
				description="Your prepaid balance and recent spend. Payments are stubbed in this version."
			/>
			<PageContainer>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Card className="p-5">
						<span className="text-sm text-gray-500">Current balance</span>
						{balance.isLoading ? (
							<div className="mt-2 h-8 w-32 animate-pulse rounded bg-gray-100" />
						) : balance.isError ? (
							<div className="mt-2 text-2xl font-semibold text-gray-300">—</div>
						) : (
							<>
								<div className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
									{balance.data ? formatUsd(balance.data.amountMicroUsd, 2) : "—"}
								</div>
								<div className="mt-1 text-xs text-gray-400">
									{balance.data
										? `Updated ${formatDateTime(balance.data.updatedAt)}`
										: ""}
								</div>
							</>
						)}
					</Card>

					<Card className="flex flex-col justify-between p-5">
						<div>
							<span className="text-sm text-gray-500">Add funds</span>
							<p className="mt-2 text-sm text-gray-400">
								Top up your prepaid balance to keep requests flowing.
							</p>
						</div>
						<div className="mt-4 flex items-center gap-3">
							<Button variant="primary" disabled title="payments stubbed in v1">
								Add funds
							</Button>
							<Badge tone="amber">payments stubbed in v1</Badge>
						</div>
					</Card>
				</div>

				<section className="mt-8">
					<h2 className="mb-3 text-sm font-medium text-gray-700">
						Statement · last 30 days
					</h2>
					{usage.isLoading ? (
						<LoadingState />
					) : usage.isError ? (
						<ErrorState error={usage.error} />
					) : (
						<Table>
							<THead>
								<tr>
									<TH>Description</TH>
									<TH>Period</TH>
									<TH className="text-right">Amount</TH>
								</tr>
							</THead>
							<tbody>
								<TR>
									<TD className="font-medium text-gray-800">
										Gateway usage
									</TD>
									<TD className="text-gray-500">Last 30 days</TD>
									<TD className="text-right">
										{usage.data ? formatUsd(usage.data.totalCostMicroUsd) : "—"}
									</TD>
								</TR>
								<TR>
									<TD className="text-gray-400" colSpan={2}>
										Detailed invoices will appear here once billing is enabled.
									</TD>
									<TD className="text-right text-gray-300">—</TD>
								</TR>
							</tbody>
						</Table>
					)}
				</section>
			</PageContainer>
		</>
	);
}
