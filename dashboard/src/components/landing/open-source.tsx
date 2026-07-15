"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GitHubIcon from "@mui/icons-material/GitHub";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { GITHUB_URL, MONO } from "./constants";

const POINTS = [
	"MIT licensed — use it commercially, fork it, change it.",
	"Self-host in minutes with Docker.",
	"Every request, price and route is fully auditable.",
];

/** OpenSource is the "Built in the open" section with the repo + docker snippet. */
export function OpenSource() {
	return (
		<Box
			component="section"
			sx={{
				py: { xs: 8, md: 12 },
				bgcolor: "background.paper",
				borderTop: "1px solid",
				borderColor: "divider",
			}}
		>
			<Container maxWidth="lg">
				<Box
					sx={{
						display: "grid",
						gap: { xs: 4, md: 6 },
						gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
						alignItems: "center",
					}}
				>
					<Box>
						<Typography
							sx={{
								fontSize: "0.72rem",
								fontWeight: 600,
								letterSpacing: "0.08em",
								textTransform: "uppercase",
								color: "text.disabled",
								mb: 1.5,
							}}
						>
							Open source
						</Typography>
						<Typography
							component="h2"
							sx={{
								fontSize: { xs: "1.75rem", md: "2.25rem" },
								fontWeight: 700,
								letterSpacing: "-0.02em",
								lineHeight: 1.15,
							}}
						>
							Built in the open
						</Typography>
						<Typography
							sx={{
								mt: 1.75,
								fontSize: { xs: "1rem", md: "1.1rem" },
								lineHeight: 1.55,
								color: "text.secondary",
							}}
						>
							Heimdal is developed in public on GitHub. Read the code, open an
							issue, or run the whole thing on your own infrastructure.
						</Typography>

						<Stack spacing={1.25} sx={{ mt: 3 }}>
							{POINTS.map((point) => (
								<Box
									key={point}
									sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}
								>
									<Box
										sx={{
											mt: "7px",
											width: 6,
											height: 6,
											borderRadius: "50%",
											bgcolor: "text.primary",
											flexShrink: 0,
										}}
									/>
									<Typography sx={{ fontSize: "0.95rem", color: "text.secondary" }}>
										{point}
									</Typography>
								</Box>
							))}
						</Stack>

						<Stack direction="row" spacing={1.5} sx={{ mt: 3.5, flexWrap: "wrap", rowGap: 1.5 }}>
							<Button
								component={Link}
								href={GITHUB_URL}
								target="_blank"
								rel="noopener noreferrer"
								variant="contained"
								startIcon={<GitHubIcon />}
							>
								View on GitHub
							</Button>
							<Button
								component={Link}
								href={GITHUB_URL}
								target="_blank"
								rel="noopener noreferrer"
								variant="outlined"
								startIcon={<StarRoundedIcon />}
							>
								Star on GitHub
							</Button>
						</Stack>
					</Box>

					<Box
						sx={{
							border: "1px solid",
							borderColor: "divider",
							borderRadius: 2.5,
							bgcolor: "background.default",
							overflow: "hidden",
						}}
					>
						<Box
							sx={{
								px: 2,
								py: 1.25,
								borderBottom: "1px solid",
								borderColor: "divider",
								fontFamily: MONO,
								fontSize: "0.72rem",
								color: "text.disabled",
							}}
						>
							run it locally
						</Box>
						<Box
							component="pre"
							sx={{
								m: 0,
								px: 2.5,
								py: 2.5,
								fontFamily: MONO,
								fontSize: { xs: "0.74rem", sm: "0.82rem" },
								lineHeight: 2,
								overflowX: "auto",
								whiteSpace: "pre",
							}}
						>
							<Box component="span" sx={{ color: "text.disabled" }}>
								{"# clone and start the gateway\n"}
							</Box>
							<Box component="span" sx={{ color: "text.secondary" }}>
								git clone{" "}
							</Box>
							<Box component="span" sx={{ color: "info.main" }}>
								github.com/Nossulenko/heimdal
							</Box>
							{"\n"}
							<Box component="span" sx={{ color: "text.secondary" }}>
								cd heimdal
							</Box>
							{"\n"}
							<Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
								docker compose up
							</Box>
							{"\n\n"}
							<Box component="span" sx={{ color: "success.main" }}>
								{"✓ gateway ready on :8080"}
							</Box>
						</Box>
					</Box>
				</Box>
			</Container>
		</Box>
	);
}
