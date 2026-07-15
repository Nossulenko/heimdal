"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { ProviderLogo, providerLabel } from "@/components/provider-logo";
import { CodeCard } from "./code-card";
import { GITHUB_URL, PROVIDERS } from "./constants";

/** Hero is the top marketing section: headline, CTAs, provider strip, snippet. */
export function Hero() {
	return (
		<Box
			component="section"
			sx={{
				position: "relative",
				overflow: "hidden",
				borderBottom: "1px solid",
				borderColor: "divider",
				background:
					"radial-gradient(1200px 500px at 50% -8%, rgba(17,17,17,0.05), rgba(17,17,17,0) 70%)",
			}}
		>
			<Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 8, md: 11 } }}>
				<Box sx={{ maxWidth: 760, mx: "auto", textAlign: "center" }}>
					<Box
						sx={{
							display: "inline-flex",
							alignItems: "center",
							gap: 1,
							px: 1.5,
							py: 0.5,
							mb: 3,
							borderRadius: 999,
							border: "1px solid",
							borderColor: "divider",
							bgcolor: "background.paper",
							fontSize: "0.78rem",
							fontWeight: 500,
							color: "text.secondary",
						}}
					>
						<Box
							sx={{
								width: 7,
								height: 7,
								borderRadius: "50%",
								bgcolor: "success.main",
							}}
						/>
						Open-source · self-hostable · MIT licensed
					</Box>

					<Typography
						component="h1"
						sx={{
							fontSize: { xs: "2.5rem", sm: "3.25rem", md: "3.75rem" },
							fontWeight: 700,
							letterSpacing: "-0.03em",
							lineHeight: 1.05,
						}}
					>
						One API for every model.
					</Typography>

					<Typography
						sx={{
							mt: 2.5,
							fontSize: { xs: "1.05rem", md: "1.2rem" },
							lineHeight: 1.55,
							color: "text.secondary",
							maxWidth: 620,
							mx: "auto",
						}}
					>
						Route your LLM calls to the best — and cheapest — model. A
						self-hostable, OpenAI-compatible gateway you fully own.
					</Typography>

					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={1.5}
						sx={{ mt: 4, justifyContent: "center", alignItems: "center" }}
					>
						<Button
							component={Link}
							href="/login"
							variant="contained"
							size="large"
							endIcon={<ArrowForwardRoundedIcon />}
							sx={{ px: 3, minHeight: 46, fontSize: "0.95rem" }}
						>
							Get started
						</Button>
						<Button
							component={Link}
							href="/catalog"
							variant="outlined"
							size="large"
							sx={{ px: 3, minHeight: 46, fontSize: "0.95rem" }}
						>
							Browse models
						</Button>
						<Button
							component={Link}
							href={GITHUB_URL}
							target="_blank"
							rel="noopener noreferrer"
							variant="text"
							size="large"
							startIcon={<StarRoundedIcon />}
							sx={{ px: 2, minHeight: 46, fontSize: "0.95rem", color: "text.secondary" }}
						>
							Star on GitHub
						</Button>
					</Stack>

					<Box sx={{ mt: 5 }}>
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
							Works with
						</Typography>
						<Stack
							direction="row"
							spacing={3}
							sx={{
								justifyContent: "center",
								alignItems: "center",
								flexWrap: "wrap",
								rowGap: 1.5,
							}}
						>
							{PROVIDERS.map((p) => (
								<Box
									key={p}
									sx={{
										display: "inline-flex",
										alignItems: "center",
										gap: 1,
										color: "text.secondary",
										fontSize: "0.9rem",
										fontWeight: 500,
									}}
								>
									<ProviderLogo provider={p} size={20} />
									{providerLabel(p)}
								</Box>
							))}
						</Stack>
					</Box>
				</Box>

				<Box sx={{ maxWidth: 720, mx: "auto", mt: { xs: 6, md: 7 } }}>
					<CodeCard />
				</Box>
			</Container>
		</Box>
	);
}
