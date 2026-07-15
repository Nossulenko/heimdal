"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { CostChart, TokensChart } from "@/components/charts";
import { PageContainer, PageHeader } from "@/components/page-header";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { rangeForDays } from "@/lib/dates";
import { formatNumber, formatUsd } from "@/lib/format";
import { useUsage } from "@/lib/hooks";

const PRESETS = [
	{ label: "7 days", days: 7 },
	{ label: "30 days", days: 30 },
	{ label: "90 days", days: 90 },
] as const;

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
				title="Usage"
				description="Track cost and token consumption across your gateway over time."
				actions={
					<ToggleButtonGroup
						exclusive
						size="small"
						value={days}
						onChange={(_, next) => {
							if (next !== null) setDays(next);
						}}
					>
						{PRESETS.map((p) => (
							<ToggleButton key={p.days} value={p.days} sx={{ px: 1.75 }}>
								{p.label}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
				}
			/>
			<PageContainer>
				{usage.isLoading ? (
					<LoadingState />
				) : usage.isError ? (
					<ErrorState error={usage.error} />
				) : usage.data ? (
					<Stack spacing={5}>
						<Box
							sx={{
								display: "grid",
								gap: 2,
								gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
							}}
						>
							<StatCard
								label={`Total spend · ${days}d`}
								value={formatUsd(usage.data.totalCostMicroUsd)}
							/>
							<StatCard
								label={`Total tokens · ${days}d`}
								value={formatNumber(usage.data.totalTokens)}
							/>
						</Box>

						{hasSeries ? (
							<>
								<Box component="section">
									<SectionTitle>Daily cost</SectionTitle>
									<Card sx={{ p: 2 }}>
										<CostChart series={usage.data.series} />
									</Card>
								</Box>

								<Box component="section">
									<SectionTitle>Daily tokens</SectionTitle>
									<Card sx={{ p: 2 }}>
										<TokensChart series={usage.data.series} />
									</Card>
								</Box>
							</>
						) : (
							<EmptyState
								title="No usage in this range"
								description="Try a wider date range, or send some requests through the gateway."
							/>
						)}

						<Box component="section">
							<SectionTitle>By model</SectionTitle>
							{byModel.length > 0 ? (
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
											{byModel.map((m) => (
												<TableRow key={m.logicalModel} hover>
													<TableCell sx={{ fontWeight: 500 }}>
														{m.logicalModel}
													</TableCell>
													<TableCell align="right">
														{formatNumber(m.requests)}
													</TableCell>
													<TableCell align="right">
														{formatNumber(m.tokens)}
													</TableCell>
													<TableCell align="right">
														{formatUsd(m.costMicroUsd)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							) : (
								<EmptyState title="No model activity in this range" />
							)}
						</Box>
					</Stack>
				) : null}
			</PageContainer>
		</>
	);
}
