"use client";

import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { PageContainer, PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ToneChip } from "@/components/tone-chip";
import { formatPricePerMillion } from "@/lib/format";
import { useModels } from "@/lib/hooks";

export default function ModelsPage() {
	const models = useModels();

	return (
		<>
			<PageHeader
				icon="🧠"
				title="Models"
				description="The model registry your gateway can route to. Prices are shown per 1M tokens."
			/>
			<PageContainer>
				{models.isLoading ? (
					<LoadingState />
				) : models.isError ? (
					<ErrorState error={models.error} />
				) : models.data && models.data.length > 0 ? (
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Logical name</TableCell>
									<TableCell>Provider</TableCell>
									<TableCell>Provider model ID</TableCell>
									<TableCell align="right">Input / 1M</TableCell>
									<TableCell align="right">Output / 1M</TableCell>
									<TableCell>Status</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{models.data.map((m) => (
									<TableRow key={`${m.provider}/${m.logicalName}`} hover>
										<TableCell sx={{ fontWeight: 500 }}>
											{m.logicalName}
										</TableCell>
										<TableCell>
											<ToneChip label={m.provider} tone="info" />
										</TableCell>
										<TableCell>
											<Box
												component="code"
												sx={{
													fontFamily:
														"ui-monospace, SFMono-Regular, Menlo, monospace",
													fontSize: "0.78rem",
													color: "text.secondary",
												}}
											>
												{m.providerModelId}
											</Box>
										</TableCell>
										<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{formatPricePerMillion(m.inputPricePerToken)}
										</TableCell>
										<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{formatPricePerMillion(m.outputPricePerToken)}
										</TableCell>
										<TableCell>
											{m.active ? (
												<ToneChip label="Active" tone="success" />
											) : (
												<ToneChip label="Inactive" tone="neutral" />
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				) : (
					<EmptyState
						title="No models configured"
						description="Your gateway’s model registry is empty."
					/>
				)}
			</PageContainer>
		</>
	);
}
