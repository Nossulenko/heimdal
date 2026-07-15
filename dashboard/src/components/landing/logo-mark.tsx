"use client";

import Box from "@mui/material/Box";

/**
 * LogoMark is the square Heimdal "H" badge reused across the landing nav,
 * footer and CTA sections. It mirrors the badge used on the login/public pages.
 */
export function LogoMark({
	size = 28,
	fontSize = 14,
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
				fontWeight: 700,
				fontSize,
				flexShrink: 0,
			}}
		>
			H
		</Box>
	);
}
