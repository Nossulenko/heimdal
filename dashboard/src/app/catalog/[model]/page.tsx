"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { API_URL } from "@/lib/api";
import { ProviderLogo, providerLabel } from "@/components/provider-logo";
import { PublicHeader } from "@/components/public-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { formatPricePerMillion } from "@/lib/format";
import { useCatalog } from "@/lib/hooks";

export default function ModelDetailPage() {
	const params = useParams();
	const model = decodeURIComponent(String(params.model ?? ""));
	const catalog = useCatalog();

	const rows = useMemo(
		() => (catalog.data ?? []).filter((m) => m.logicalName === model),
		[catalog.data, model],
	);
	const providers = useMemo(
		() => [...new Set(rows.map((r) => r.provider))],
		[rows],
	);

	const snippet = `curl ${API_URL}/v1/chat/completions \\
  -H "Authorization: Bearer $HEIMDAL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${model}","messages":[{"role":"user","content":"Hello"}]}'`;

	return (
		<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
			<PublicHeader />
			<Container maxWidth="md" sx={{ py: 4 }}>
				<Button
					component={Link}
					href="/catalog"
					startIcon={<ArrowBackIcon fontSize="small" />}
					size="small"
					sx={{ mb: 3, textTransform: "none", color: "text.secondary" }}
				>
					Catalog
				</Button>

				{catalog.isLoading ? (
					<LoadingState />
				) : catalog.isError ? (
					<ErrorState error={catalog.error} />
				) : rows.length === 0 ? (
					<EmptyState
						title="Model not found"
						description={`No model named "${model}" is in the catalog.`}
					/>
				) : (
					<>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
							{providers.map((p) => (
								<ProviderLogo key={p} provider={p} size={26} />
							))}
						</Box>
						<Typography
							component="h1"
							sx={{
								fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
								fontWeight: 700,
								fontSize: "1.6rem",
							}}
						>
							{model}
						</Typography>
						<Typography sx={{ color: "text.secondary", mt: 0.5, mb: 4 }}>
							Available from {providers.map((p) => providerLabel(p)).join(", ")}.
							Routed through one OpenAI-compatible API — with fallback, cost and
							latency routing across providers.
						</Typography>

						<Typography sx={{ fontWeight: 600, mb: 1 }}>Providers &amp; pricing</Typography>
						<TableContainer sx={{ mb: 4 }}>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Provider</TableCell>
										<TableCell>Provider model ID</TableCell>
										<TableCell align="right">Input / 1M</TableCell>
										<TableCell align="right">Output / 1M</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{rows.map((r) => (
										<TableRow key={`${r.provider}/${r.providerModelId}`} hover>
											<TableCell>
												<Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
													<ProviderLogo provider={r.provider} size={18} />
													{providerLabel(r.provider)}
												</Box>
											</TableCell>
											<TableCell
												sx={{
													fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
													fontSize: "0.8rem",
													color: "text.secondary",
												}}
											>
												{r.providerModelId}
											</TableCell>
											<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
												{formatPricePerMillion(r.inputPricePerToken)}
											</TableCell>
											<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
												{formatPricePerMillion(r.outputPricePerToken)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>

						<Typography sx={{ fontWeight: 600, mb: 1 }}>Call it</Typography>
						<Box
							component="pre"
							sx={{
								m: 0,
								p: 2,
								borderRadius: 2,
								bgcolor: "action.hover",
								overflowX: "auto",
								fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
								fontSize: "0.8rem",
								lineHeight: 1.6,
							}}
						>
							{snippet}
						</Box>
					</>
				)}
			</Container>
		</Box>
	);
}
