import type { Metadata } from "next";
import Box from "@mui/material/Box";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { Steps } from "@/components/landing/steps";
import { Providers } from "@/components/landing/providers";
import { Features } from "@/components/landing/features";
import { OpenSource } from "@/components/landing/open-source";
import { CtaBand } from "@/components/landing/cta-band";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
	title: "Heimdal — One API for every model",
	description:
		"Route your LLM calls to the best — and cheapest — model. A self-hostable, OpenAI-compatible gateway you fully own.",
};

export default function LandingPage() {
	return (
		<Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
			<LandingNav />
			<Box component="main">
				<Hero />
				<Steps />
				<Providers />
				<Features />
				<OpenSource />
				<CtaBand />
			</Box>
			<Footer />
		</Box>
	);
}
