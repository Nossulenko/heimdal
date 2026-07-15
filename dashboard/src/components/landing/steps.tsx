"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import { SectionHeading } from "./section-heading";

const STEPS: {
	no: string;
	icon: SvgIconComponent;
	title: string;
	body: string;
}[] = [
	{
		no: "01",
		icon: VpnKeyRoundedIcon,
		title: "Add your provider keys",
		body: "Bring your own OpenAI, Anthropic and Google keys. Heimdal stores them encrypted and never marks up your usage.",
	},
	{
		no: "02",
		icon: AltRouteRoundedIcon,
		title: "Route with one API",
		body: "Automatic fallback plus cost- and latency-aware routing. Send x-route: cost and always land on the cheapest healthy model.",
	},
	{
		no: "03",
		icon: SavingsRoundedIcon,
		title: "Cache & save",
		body: "Identical requests are served straight from cache, so repeated calls cost nothing — and every response reports what you saved.",
	},
];

/** Steps is the "Control your costs" three-step how-it-works section. */
export function Steps() {
	return (
		<Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
			<Container maxWidth="lg">
				<SectionHeading
					eyebrow="How it works"
					title="Control your costs"
					subtitle="Three steps to a gateway that routes every request to the best value model — without touching your application code."
				/>

				<Box
					sx={{
						mt: { xs: 5, md: 7 },
						display: "grid",
						gap: 2.5,
						gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
					}}
				>
					{STEPS.map(({ no, icon: Icon, title, body }) => (
						<Box
							key={no}
							sx={{
								border: "1px solid",
								borderColor: "divider",
								borderRadius: 2.5,
								bgcolor: "background.paper",
								p: 3.5,
								display: "flex",
								flexDirection: "column",
								gap: 2,
							}}
						>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
								}}
							>
								<Box
									sx={{
										width: 42,
										height: 42,
										borderRadius: 2,
										display: "grid",
										placeItems: "center",
										bgcolor: "background.default",
										border: "1px solid",
										borderColor: "divider",
										color: "text.primary",
									}}
								>
									<Icon sx={{ fontSize: 21 }} />
								</Box>
								<Typography
									sx={{
										fontSize: "1.1rem",
										fontWeight: 700,
										color: "text.disabled",
										letterSpacing: "0.02em",
									}}
								>
									{no}
								</Typography>
							</Box>
							<Typography sx={{ fontSize: "1.05rem", fontWeight: 600 }}>
								{title}
							</Typography>
							<Typography
								sx={{ fontSize: "0.92rem", lineHeight: 1.6, color: "text.secondary" }}
							>
								{body}
							</Typography>
						</Box>
					))}
				</Box>
			</Container>
		</Box>
	);
}
