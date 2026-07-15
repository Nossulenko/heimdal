"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { ProviderLogo, providerLabel } from "@/components/provider-logo";
import { PROVIDERS } from "./constants";
import { SectionHeading } from "./section-heading";

/** Providers highlights multi-provider support and links to the full catalog. */
export function Providers() {
	return (
		<Box
			component="section"
			sx={{
				py: { xs: 8, md: 12 },
				bgcolor: "background.paper",
				borderTop: "1px solid",
				borderBottom: "1px solid",
				borderColor: "divider",
			}}
		>
			<Container maxWidth="lg">
				<SectionHeading
					eyebrow="No lock-in"
					title="Don't get locked into one provider"
					subtitle="Heimdal speaks to every major provider through one API. Switch, mix, or fall back between them without rewriting a line."
				/>

				<Box
					sx={{
						mt: { xs: 5, md: 7 },
						display: "grid",
						gap: 2.5,
						gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
					}}
				>
					{PROVIDERS.map((p) => (
						<Box
							key={p}
							sx={{
								border: "1px solid",
								borderColor: "divider",
								borderRadius: 2.5,
								bgcolor: "background.default",
								px: 3,
								py: 4,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: 1.75,
							}}
						>
							<Box
								sx={{
									width: 56,
									height: 56,
									borderRadius: 2,
									display: "grid",
									placeItems: "center",
									bgcolor: "background.paper",
									border: "1px solid",
									borderColor: "divider",
								}}
							>
								<ProviderLogo provider={p} size={30} />
							</Box>
							<Typography sx={{ fontSize: "1rem", fontWeight: 600 }}>
								{providerLabel(p)}
							</Typography>
						</Box>
					))}
				</Box>

				<Box
					sx={{
						mt: 4,
						display: "flex",
						flexDirection: { xs: "column", sm: "row" },
						alignItems: "center",
						justifyContent: "center",
						gap: 1.5,
						textAlign: "center",
					}}
				>
					<Typography sx={{ color: "text.secondary", fontSize: "0.95rem" }}>
						New providers are one adapter away.
					</Typography>
					<Box
						component={Link}
						href="/catalog"
						sx={{
							display: "inline-flex",
							alignItems: "center",
							gap: 0.5,
							fontSize: "0.95rem",
							fontWeight: 600,
							color: "text.primary",
							textDecoration: "none",
							"&:hover": { textDecoration: "underline" },
						}}
					>
						Browse the catalog
						<ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />
					</Box>
				</Box>
			</Container>
		</Box>
	);
}
