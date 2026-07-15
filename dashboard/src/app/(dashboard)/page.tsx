"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ShowChartOutlinedIcon from "@mui/icons-material/ShowChartOutlined";
import TokenOutlinedIcon from "@mui/icons-material/TokenOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import { CostChart } from "@/components/charts";
import { PageContainer, PageHeader } from "@/components/page-header";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { rangeForDays } from "@/lib/dates";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/format";
import { useBalance, useUsage } from "@/lib/hooks";

const iconSx = { fontSize: 18 };

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
				<Box
					sx={{
						display: "grid",
						gap: 2,
						gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
					}}
				>
					<StatCard
						label="Balance"
						icon={<AccountBalanceWalletOutlinedIcon sx={iconSx} />}
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
						icon={<ShowChartOutlinedIcon sx={iconSx} />}
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
						icon={<TokenOutlinedIcon sx={iconSx} />}
						value={
							usage.data
								? formatNumber(usage.data.totalTokens)
								: usage.isError
									? "—"
									: "…"
						}
					/>
				</Box>

				<Box component="section" sx={{ mt: 5 }}>
					<SectionTitle>Daily cost</SectionTitle>
					{usage.isLoading ? (
						<LoadingState />
					) : usage.isError ? (
						<ErrorState error={usage.error} />
					) : usage.data && usage.data.series.length > 0 ? (
						<Card sx={{ p: 2 }}>
							<CostChart series={usage.data.series} />
						</Card>
					) : (
						<EmptyState
							title="No usage yet"
							description="Once you start sending requests through the gateway, your daily cost will appear here."
						/>
					)}
				</Box>

				<Box component="section" sx={{ mt: 5 }}>
					<SectionTitle>Top models by spend</SectionTitle>
					{usage.isLoading ? (
						<LoadingState />
					) : usage.isError ? (
						<ErrorState error={usage.error} />
					) : topModels.length > 0 ? (
						<TableContainer>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Model</TableCell>
										<TableCell align="right">Requests</TableCell>
										<TableCell align="right">Tokens</TableCell>
										<TableCell align="right">Spend</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{topModels.map((m) => (
										<TableRow key={m.logicalModel} hover>
											<TableCell sx={{ fontWeight: 500 }}>
												{m.logicalModel}
											</TableCell>
											<TableCell align="right">
												{formatNumber(m.requests)}
											</TableCell>
											<TableCell align="right">{formatNumber(m.tokens)}</TableCell>
											<TableCell align="right">
												{formatUsd(m.costMicroUsd)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					) : (
						<EmptyState
							title="No model activity"
							description="Model-level spend will show up here after your first requests."
						/>
					)}
				</Box>
			</PageContainer>
		</>
	);
}
