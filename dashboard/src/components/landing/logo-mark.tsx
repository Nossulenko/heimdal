"use client";

import Box from "@mui/material/Box";
import { HeimdalMark } from "@/components/heimdal-mark";

/**
 * LogoMark is the square Heimdal badge (the three-triangle mark) reused across
 * the landing nav, footer and CTA sections. Mirrors the badge on the
 * login/public pages.
 */
export function LogoMark({
	size = 28,
	radius = 1.5,
}: {
	size?: number;
	fontSize?: number;
	radius?: number;
}) {
	return (
		<Box
			aria-hidden
			sx={{
				width: size,
				height: size,
				borderRadius: radius,
				bgcolor: "primary.main",
				color: "primary.contrastText",
				display: "grid",
				placeItems: "center",
				flexShrink: 0,
			}}
		>
			<HeimdalMark size={Math.round(size * 0.6)} />
		</Box>
	);
}
