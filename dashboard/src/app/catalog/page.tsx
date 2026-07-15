"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import type { Model } from "@/lib/api";
import { ProviderLogo, providerLabel } from "@/components/provider-logo";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { formatPricePerMillion } from "@/lib/format";
import { useCatalog } from "@/lib/hooks";

interface Grouped {
	logicalName: string;
	rows: Model[];
}

const PROVIDER_FILTERS = ["openai", "anthropic", "google"] as const;

function combinedPrice(m: Model): number {
	return m.inputPricePerToken + m.outputPricePerToken;
}

function cheapest(rows: Model[]): Model {
	return rows.reduce((a, b) => (combinedPrice(b) < combinedPrice(a) ? b : a));
}

export default function CatalogPage() {
	const catalog = useCatalog();
	const [query, setQuery] = useState("");
	const [providers, setProviders] = useState<string[]>([]);
	const [sort, setSort] = useState<"name" | "cost">("name");

	const groups = useMemo(() => {
		const map = new Map<string, Grouped>();
		for (const m of catalog.data ?? []) {
			const g = map.get(m.logicalName) ?? { logicalName: m.logicalName, rows: [] };
			g.rows.push(m);
			map.set(m.logicalName, g);
		}
		let list = [...map.values()];

		const q = query.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(g) =>
					g.logicalName.toLowerCase().includes(q) ||
					g.rows.some(
						(r) =>
							r.provider.includes(q) ||
							r.providerModelId.toLowerCase().includes(q),
					),
			);
		}
		if (providers.length > 0) {
			list = list.filter((g) => g.rows.some((r) => providers.includes(r.provider)));
		}

		list.sort((a, b) =>
			sort === "name"
				? a.logicalName.localeCompare(b.logicalName)
				: combinedPrice(cheapest(a.rows)) - combinedPrice(cheapest(b.rows)),
		);
		return list;
	}, [catalog.data, query, providers, sort]);

	return (
		<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
			<Box
				component="header"
				sx={{
					borderBottom: "1px solid",
					borderColor: "divider",
					px: 3,
					py: 1.5,
					display: "flex",
					alignItems: "center",
					gap: 1.5,
					position: "sticky",
					top: 0,
					bgcolor: "background.default",
					zIndex: 1,
				}}
			>
				<Box
					sx={{
						width: 28,
						height: 28,
						borderRadius: 1.5,
						bgcolor: "primary.main",
						color: "primary.contrastText",
						display: "grid",
						placeItems: "center",
						fontWeight: 700,
						fontSize: 14,
					}}
				>
					H
				</Box>
				<Typography sx={{ fontWeight: 700 }}>Heimdal</Typography>
				<Box sx={{ flex: 1 }} />
				<Button component={Link} href="/login" variant="outlined" size="small">
					Sign in
				</Button>
			</Box>

			<Container maxWidth="lg" sx={{ py: 5 }}>
				<Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
					Model catalog
				</Typography>
				<Typography sx={{ color: "text.secondary", mb: 4 }}>
					Every model Heimdal can route to, through one OpenAI-compatible API.
					Prices are per 1M tokens.
				</Typography>

				<Box
					sx={{
						display: "flex",
						flexWrap: "wrap",
						gap: 1.5,
						alignItems: "center",
						mb: 3,
					}}
				>
					<TextField
						size="small"
						placeholder="Search models…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						sx={{ minWidth: 240 }}
						slotProps={{
							input: {
								startAdornment: (
									<InputAdornment position="start">
										<SearchIcon fontSize="small" />
									</InputAdornment>
								),
							},
						}}
					/>
					<ToggleButtonGroup
						size="small"
						value={providers}
						onChange={(_, next: string[]) => setProviders(next)}
					>
						{PROVIDER_FILTERS.map((p) => (
							<ToggleButton key={p} value={p} sx={{ textTransform: "none", gap: 0.75 }}>
								<ProviderLogo provider={p} size={16} />
								{providerLabel(p)}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					<Box sx={{ flex: 1 }} />
					<ToggleButtonGroup
						size="small"
						exclusive
						value={sort}
						onChange={(_, next) => next && setSort(next)}
					>
						<ToggleButton value="name" sx={{ textTransform: "none" }}>
							Name
						</ToggleButton>
						<ToggleButton value="cost" sx={{ textTransform: "none" }}>
							Cheapest
						</ToggleButton>
					</ToggleButtonGroup>
				</Box>

				{catalog.isLoading ? (
					<LoadingState />
				) : catalog.isError ? (
					<ErrorState error={catalog.error} />
				) : groups.length === 0 ? (
					<EmptyState
						title="No models found"
						description="Try a different search or clear the filters."
					/>
				) : (
					<Box
						sx={{
							display: "grid",
							gap: 2,
							gridTemplateColumns: {
								xs: "1fr",
								sm: "1fr 1fr",
								md: "1fr 1fr 1fr",
							},
						}}
					>
						{groups.map((g) => {
							const best = cheapest(g.rows);
							const uniqueProviders = [...new Set(g.rows.map((r) => r.provider))];
							return (
								<Box
									key={g.logicalName}
									sx={{
										border: "1px solid",
										borderColor: "divider",
										borderRadius: 2,
										p: 2.5,
										display: "flex",
										flexDirection: "column",
										gap: 1.5,
										transition: "border-color .15s",
										"&:hover": { borderColor: "text.disabled" },
									}}
								>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
										{uniqueProviders.map((p) => (
											<ProviderLogo key={p} provider={p} size={22} />
										))}
									</Box>
									<Box
										component="code"
										sx={{
											fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
											fontWeight: 600,
											fontSize: "0.95rem",
										}}
									>
										{g.logicalName}
									</Box>
									<Box sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
										{uniqueProviders.map((p) => providerLabel(p)).join(" · ")}
									</Box>
									<Box sx={{ flex: 1 }} />
									<Box
										sx={{
											display: "flex",
											justifyContent: "space-between",
											borderTop: "1px solid",
											borderColor: "divider",
											pt: 1.5,
											fontSize: "0.82rem",
										}}
									>
										<Box>
											<Box sx={{ color: "text.disabled" }}>Input</Box>
											<Box sx={{ fontWeight: 600 }}>
												{formatPricePerMillion(best.inputPricePerToken)}
											</Box>
										</Box>
										<Box sx={{ textAlign: "right" }}>
											<Box sx={{ color: "text.disabled" }}>Output</Box>
											<Box sx={{ fontWeight: 600 }}>
												{formatPricePerMillion(best.outputPricePerToken)}
											</Box>
										</Box>
									</Box>
								</Box>
							);
						})}
					</Box>
				)}
			</Container>
		</Box>
	);
}
