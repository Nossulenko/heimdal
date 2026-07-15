"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import ApiRoundedIcon from "@mui/icons-material/ApiRounded";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import { MONO } from "./constants";
import { SectionHeading } from "./section-heading";

const FEATURES: {
	icon: SvgIconComponent;
	title: string;
	body: string;
}[] = [
	{
		icon: ApiRoundedIcon,
		title: "Unified OpenAI-compatible API",
		body: "Point any OpenAI SDK at Heimdal. The same request and response shape works across every provider.",
	},
	{
		icon: AltRouteRoundedIcon,
		title: "Smart routing",
		body: "Fallback, circuit breaking, x-route: cost | latency, and provider pinning — controlled per request.",
	},
	{
		icon: BoltRoundedIcon,
		title: "Response caching + savings",
		body: "Identical calls are de-duplicated from cache automatically, and every response reports what it saved.",
	},
	{
		icon: ReceiptLongRoundedIcon,
		title: "Usage metering & prepaid billing",
		body: "Per-key metering with prepaid balances, so spend is measured, capped and never a surprise.",
	},
	{
		icon: ChatBubbleOutlineRoundedIcon,
		title: "In-app chat playground",
		body: "Test prompts and compare models side by side from the dashboard before you ship them.",
	},
	{
		icon: LockOpenRoundedIcon,
		title: "Self-hosted & MIT-licensed",
		body: "Run it on your own infrastructure. No vendor lock-in, no per-seat pricing, no black boxes.",
	},
];

/** Features is the 3x2 grid of core capabilities. */
export function Features() {
	return (
		<Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
			<Container maxWidth="lg">
				<SectionHeading
					eyebrow="Features"
					title="Everything you need to run a gateway"
					subtitle="Batteries included — routing, caching, metering and a playground — all behind one API you host yourself."
				/>

				<Box
					sx={{
						mt: { xs: 5, md: 7 },
						display: "grid",
						gap: 2.5,
						gridTemplateColumns: {
							xs: "1fr",
							sm: "repeat(2, 1fr)",
							md: "repeat(3, 1fr)",
						},
					}}
				>
					{FEATURES.map(({ icon: Icon, title, body }) => (
						<Box
							key={title}
							sx={{
								border: "1px solid",
								borderColor: "divider",
								borderRadius: 2.5,
								bgcolor: "background.paper",
								p: 3.25,
								display: "flex",
								flexDirection: "column",
								gap: 1.75,
								transition: "border-color .15s",
								"&:hover": { borderColor: "text.disabled" },
							}}
						>
							<Box
								sx={{
									width: 40,
									height: 40,
									borderRadius: 2,
									display: "grid",
									placeItems: "center",
									bgcolor: "background.default",
									border: "1px solid",
									borderColor: "divider",
									color: "text.primary",
								}}
							>
								<Icon sx={{ fontSize: 20 }} />
							</Box>
							<Typography sx={{ fontSize: "1.02rem", fontWeight: 600 }}>
								{title}
							</Typography>
							<Typography
								sx={{ fontSize: "0.9rem", lineHeight: 1.6, color: "text.secondary" }}
							>
								{body.includes("x-route") ? (
									<>
										Fallback, circuit breaking,{" "}
										<Box
											component="code"
											sx={{
												fontFamily: MONO,
												fontSize: "0.82em",
												px: 0.5,
												py: 0.1,
												borderRadius: 0.75,
												bgcolor: "background.default",
												border: "1px solid",
												borderColor: "divider",
											}}
										>
											x-route: cost | latency
										</Box>
										, and provider pinning — controlled per request.
									</>
								) : (
									body
								)}
							</Typography>
						</Box>
					))}
				</Box>
			</Container>
		</Box>
	);
}
