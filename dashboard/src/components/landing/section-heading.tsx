"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/** SectionHeading is the shared eyebrow + title + subtitle block for sections. */
export function SectionHeading({
	eyebrow,
	title,
	subtitle,
	align = "center",
}: {
	eyebrow?: string;
	title: string;
	subtitle?: string;
	align?: "center" | "left";
}) {
	return (
		<Box
			sx={{
				textAlign: align,
				maxWidth: align === "center" ? 640 : "none",
				mx: align === "center" ? "auto" : 0,
			}}
		>
			{eyebrow ? (
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
					{eyebrow}
				</Typography>
			) : null}
			<Typography
				component="h2"
				sx={{
					fontSize: { xs: "1.75rem", md: "2.25rem" },
					fontWeight: 700,
					letterSpacing: "-0.02em",
					lineHeight: 1.15,
				}}
			>
				{title}
			</Typography>
			{subtitle ? (
				<Typography
					sx={{
						mt: 1.75,
						fontSize: { xs: "1rem", md: "1.1rem" },
						lineHeight: 1.55,
						color: "text.secondary",
					}}
				>
					{subtitle}
				</Typography>
			) : null}
		</Box>
	);
}
