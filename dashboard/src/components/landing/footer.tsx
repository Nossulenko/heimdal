"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { DOCS_URL, GITHUB_URL } from "./constants";
import { LogoMark } from "./logo-mark";

function FooterLink({
	href,
	external,
	children,
}: {
	href: string;
	external?: boolean;
	children: ReactNode;
}) {
	return (
		<Box
			component={Link}
			href={href}
			{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
			sx={{
				fontSize: "0.9rem",
				color: "text.secondary",
				textDecoration: "none",
				"&:hover": { color: "text.primary" },
			}}
		>
			{children}
		</Box>
	);
}

const COLUMNS: {
	heading: string;
	links: { label: string; href: string; external?: boolean }[];
}[] = [
	{
		heading: "Product",
		links: [
			{ label: "Models", href: "/catalog" },
			{ label: "Sign in", href: "/login" },
			{ label: "Get started", href: "/login" },
		],
	},
	{
		heading: "Open source",
		links: [
			{ label: "GitHub", href: GITHUB_URL, external: true },
			{ label: "Docs", href: DOCS_URL, external: true },
		],
	},
];

/** Footer is the closing site footer with brand, link columns and copyright. */
export function Footer() {
	return (
		<Box
			component="footer"
			sx={{
				borderTop: "1px solid",
				borderColor: "divider",
				bgcolor: "background.paper",
			}}
		>
			<Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
				<Box
					sx={{
						display: "grid",
						gap: { xs: 4, md: 6 },
						gridTemplateColumns: { xs: "1fr", sm: "1.5fr 1fr 1fr" },
					}}
				>
					<Box sx={{ maxWidth: 300 }}>
						<Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
							<LogoMark />
							<Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
								Heimdal
							</Typography>
						</Stack>
						<Typography sx={{ mt: 1.75, fontSize: "0.9rem", color: "text.secondary" }}>
							A self-hostable, OpenAI-compatible LLM gateway. One API for every
							model.
						</Typography>
					</Box>

					{COLUMNS.map((col) => (
						<Box key={col.heading}>
							<Typography
								sx={{
									fontSize: "0.72rem",
									fontWeight: 600,
									letterSpacing: "0.08em",
									textTransform: "uppercase",
									color: "text.disabled",
									mb: 1.75,
								}}
							>
								{col.heading}
							</Typography>
							<Stack spacing={1.25}>
								{col.links.map((l) => (
									<FooterLink key={l.label} href={l.href} external={l.external}>
										{l.label}
									</FooterLink>
								))}
							</Stack>
						</Box>
					))}
				</Box>

				<Box
					sx={{
						mt: { xs: 5, md: 7 },
						pt: 3,
						borderTop: "1px solid",
						borderColor: "divider",
						display: "flex",
						flexDirection: { xs: "column", sm: "row" },
						alignItems: { xs: "flex-start", sm: "center" },
						justifyContent: "space-between",
						gap: 1.5,
					}}
				>
					<Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>
						© 2026 Heimdal
					</Typography>
					<Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>
						MIT licensed · Built in the open
					</Typography>
				</Box>
			</Container>
		</Box>
	);
}
