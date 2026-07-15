"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import TokenOutlinedIcon from "@mui/icons-material/TokenOutlined";
import { MessagesChart } from "@/components/charts";
import { PageContainer, PageHeader } from "@/components/page-header";
import { ProviderLogo } from "@/components/provider-logo";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ToneChip, type Tone } from "@/components/tone-chip";
import { rangeForDays } from "@/lib/dates";
import {
	formatCompact,
	formatDateTime,
	formatNumber,
	formatUsd,
} from "@/lib/format";
import { useRecentUsage, useUsage } from "@/lib/hooks";

const iconSx = { fontSize: 18 };

const RANGES = [
	{ value: 7, label: "Last 7 days" },
	{ value: 30, label: "Last 30 days" },
	{ value: 90, label: "Last 90 days" },
];

function statusTone(status: string): { tone: Tone; label: string } {
	switch (status) {
		case "success":
			return { tone: "success", label: "Success" };
		case "cache_hit":
			return { tone: "info", label: "Cached" };
		case "error":
			return { tone: "danger", label: "Error" };
		default:
			return { tone: "neutral", label: status };
	}
}

export default function OverviewPage() {
	const [days, setDays] = useState(30);
	const range = useMemo(() => rangeForDays(days), [days]);
	const usage = useUsage(range.from, range.to);
	const recent = useRecentUsage(12);

	const savingsPct = useMemo(() => {
		if (!usage.data) return null;
		const { totalCostMicroUsd, totalSavingsMicroUsd } = usage.data;
		const denom = totalCostMicroUsd + totalSavingsMicroUsd;
		if (denom <= 0) return null;
		return Math.round((totalSavingsMicroUsd / denom) * 100);
	}, [usage.data]);

	const stat = (v: string | undefined) =>
		usage.data ? (v ?? "—") : usage.isError ? "—" : "…";

	return (
		<>
			<PageHeader
				title="Overview"
				description="Real-time summary of spending, tokens, and messages."
				actions={
					<TextField
						select
						size="small"
						value={days}
						onChange={(e) => setDays(Number(e.target.value))}
						sx={{ minWidth: 150 }}
					>
						{RANGES.map((r) => (
							<MenuItem key={r.value} value={r.value}>
								{r.label}
							</MenuItem>
						))}
					</TextField>
				}
			/>
			<PageContainer>
				<Box
					sx={{
						display: "grid",
						gap: 2,
						gridTemplateColumns: {
							xs: "1fr",
							sm: "repeat(2, 1fr)",
							md: "repeat(4, 1fr)",
						},
					}}
				>
					<StatCard
						label="Messages"
						icon={<ForumOutlinedIcon sx={iconSx} />}
						value={stat(usage.data && formatNumber(usage.data.totalRequests))}
					/>
					<StatCard
						label="Cost"
						icon={<PaymentsOutlinedIcon sx={iconSx} />}
						value={stat(usage.data && formatUsd(usage.data.totalCostMicroUsd, 2))}
					/>
					<StatCard
						label="Token usage"
						icon={<TokenOutlinedIcon sx={iconSx} />}
						value={stat(usage.data && formatCompact(usage.data.totalTokens))}
					/>
					<StatCard
						label="Savings"
						icon={<SavingsOutlinedIcon sx={iconSx} />}
						value={stat(usage.data && formatUsd(usage.data.totalSavingsMicroUsd, 2))}
						sub={savingsPct != null ? `${savingsPct}% of would-be spend` : undefined}
					/>
				</Box>

				<Box component="section" sx={{ mt: 5 }}>
					<SectionTitle>Messages over time</SectionTitle>
					{usage.isLoading ? (
						<LoadingState />
					) : usage.isError ? (
						<ErrorState error={usage.error} />
					) : usage.data && usage.data.series.length > 0 ? (
						<Card sx={{ p: 2 }}>
							<MessagesChart series={usage.data.series} />
						</Card>
					) : (
						<EmptyState
							title="No usage yet"
							description="Once you start sending requests through the gateway, your traffic will appear here."
						/>
					)}
				</Box>

				<Box component="section" sx={{ mt: 5 }}>
					<SectionTitle>Recent messages</SectionTitle>
					{recent.isLoading ? (
						<LoadingState />
					) : recent.isError ? (
						<ErrorState error={recent.error} />
					) : recent.data && recent.data.length > 0 ? (
						<TableContainer>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Time</TableCell>
										<TableCell>Model</TableCell>
										<TableCell align="right">Tokens</TableCell>
										<TableCell align="right">Cost</TableCell>
										<TableCell>Status</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{recent.data.map((m) => {
										const s = statusTone(m.status);
										return (
											<TableRow key={m.id} hover>
												<TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
													{formatDateTime(m.createdAt)}
												</TableCell>
												<TableCell>
													<Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
														<ProviderLogo provider={m.provider} size={16} />
														<Box component="span" sx={{ fontWeight: 500 }}>
															{m.logicalModel}
														</Box>
													</Box>
												</TableCell>
												<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
													{formatNumber(m.tokens)}
												</TableCell>
												<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
													{formatUsd(m.costMicroUsd)}
												</TableCell>
												<TableCell>
													<ToneChip label={s.label} tone={s.tone} />
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					) : (
						<EmptyState
							title="No messages yet"
							description="Requests you send through the gateway will show up here."
						/>
					)}
				</Box>
			</PageContainer>
		</>
	);
}
