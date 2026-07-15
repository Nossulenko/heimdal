"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import GitHubIcon from "@mui/icons-material/GitHub";
import { GITHUB_URL } from "./constants";

/** CtaBand is the dark full-width call-to-action near the bottom of the page. */
export function CtaBand() {
	return (
		<Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
			<Container maxWidth="lg">
				<Box
					sx={{
						borderRadius: 4,
						bgcolor: "primary.main",
						color: "primary.contrastText",
						px: { xs: 4, md: 8 },
						py: { xs: 6, md: 8 },
						textAlign: "center",
						position: "relative",
						overflow: "hidden",
					}}
				>
					<Box
						aria-hidden
						sx={{
							position: "absolute",
							inset: 0,
							background:
								"radial-gradient(600px 240px at 50% 0%, rgba(255,255,255,0.10), rgba(255,255,255,0) 70%)",
						}}
					/>
					<Box sx={{ position: "relative" }}>
						<Typography
							component="h2"
							sx={{
								fontSize: { xs: "1.85rem", md: "2.5rem" },
								fontWeight: 700,
								letterSpacing: "-0.02em",
								lineHeight: 1.1,
							}}
						>
							Start routing in minutes.
						</Typography>
						<Typography
							sx={{
								mt: 2,
								fontSize: { xs: "1rem", md: "1.1rem" },
								color: "rgba(255,255,255,0.7)",
								maxWidth: 520,
								mx: "auto",
							}}
						>
							Spin up your own OpenAI-compatible gateway and route to the best
							model on every call.
						</Typography>

						<Stack
							direction={{ xs: "column", sm: "row" }}
							spacing={1.5}
							sx={{ mt: 4, justifyContent: "center", alignItems: "center" }}
						>
							<Button
								component={Link}
								href="/login"
								size="large"
								endIcon={<ArrowForwardRoundedIcon />}
								sx={{
									px: 3,
									minHeight: 46,
									fontSize: "0.95rem",
									bgcolor: "background.paper",
									color: "text.primary",
									"&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
								}}
							>
								Get started
							</Button>
							<Button
								component={Link}
								href={GITHUB_URL}
								target="_blank"
								rel="noopener noreferrer"
								size="large"
								startIcon={<GitHubIcon />}
								sx={{
									px: 3,
									minHeight: 46,
									fontSize: "0.95rem",
									color: "primary.contrastText",
									border: "1px solid rgba(255,255,255,0.25)",
									"&:hover": {
										border: "1px solid rgba(255,255,255,0.45)",
										bgcolor: "rgba(255,255,255,0.06)",
									},
								}}
							>
								Star on GitHub
							</Button>
						</Stack>
					</Box>
				</Box>
			</Container>
		</Box>
	);
}
