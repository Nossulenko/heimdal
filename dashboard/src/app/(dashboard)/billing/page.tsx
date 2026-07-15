"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { PageContainer, PageHeader } from "@/components/page-header";
import { SectionTitle } from "@/components/section-title";
import { ErrorState, LoadingState } from "@/components/states";
import { ToneChip } from "@/components/tone-chip";
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
				title="Billing"
				description="Your prepaid balance and recent spend. Payments are stubbed in this version."
			/>
			<PageContainer>
				<Box
					sx={{
						display: "grid",
						gap: 2,
						gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
					}}
				>
					<Card sx={{ p: 2.5 }}>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							Current balance
						</Typography>
						{balance.isLoading ? (
							<Skeleton variant="rounded" width={140} height={36} sx={{ mt: 1 }} />
						) : balance.isError ? (
							<Typography
								variant="h2"
								sx={{ mt: 1, fontWeight: 600, color: "text.disabled" }}
							>
								—
							</Typography>
						) : (
							<>
								<Typography variant="h2" sx={{ mt: 1, fontWeight: 600 }}>
									{balance.data ? formatUsd(balance.data.amountMicroUsd, 2) : "—"}
								</Typography>
								<Typography
									variant="caption"
									sx={{ mt: 0.5, display: "block", color: "text.disabled" }}
								>
									{balance.data
										? `Updated ${formatDateTime(balance.data.updatedAt)}`
										: ""}
								</Typography>
							</>
						)}
					</Card>

					<Card
						sx={{
							p: 2.5,
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-between",
						}}
					>
						<Box>
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								Add funds
							</Typography>
							<Typography variant="body2" sx={{ mt: 1, color: "text.disabled" }}>
								Top up your prepaid balance to keep requests flowing.
							</Typography>
						</Box>
						<Stack direction="row" spacing={1.5} sx={{ mt: 2, alignItems: "center" }}>
							<Tooltip title="payments stubbed in v1">
								<span>
									<Button variant="contained" disabled>
										Add funds
									</Button>
								</span>
							</Tooltip>
							<ToneChip label="payments stubbed in v1" tone="warn" />
						</Stack>
					</Card>
				</Box>

				<Box component="section" sx={{ mt: 5 }}>
					<SectionTitle>Statement · last 30 days</SectionTitle>
					{usage.isLoading ? (
						<LoadingState />
					) : usage.isError ? (
						<ErrorState error={usage.error} />
					) : (
						<TableContainer>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Description</TableCell>
										<TableCell>Period</TableCell>
										<TableCell align="right">Amount</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									<TableRow hover>
										<TableCell sx={{ fontWeight: 500 }}>Gateway usage</TableCell>
										<TableCell sx={{ color: "text.secondary" }}>
											Last 30 days
										</TableCell>
										<TableCell align="right">
											{usage.data ? formatUsd(usage.data.totalCostMicroUsd) : "—"}
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell colSpan={2} sx={{ color: "text.disabled" }}>
											Detailed invoices will appear here once billing is enabled.
										</TableCell>
										<TableCell align="right" sx={{ color: "text.disabled" }}>
											—
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</Box>
			</PageContainer>
		</>
	);
}
