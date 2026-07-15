"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

/** PublicHeader is the top bar for unauthenticated pages (catalog, model pages). */
export function PublicHeader() {
	return (
		<Box
			component="header"
			sx={{
				borderBottom: "1px solid",
				borderColor: "divider",
				px: 3,
				py: 1.5,
				display: "flex",
				alignItems: "center",
				gap: 1.5,
				position: "sticky",
				top: 0,
				bgcolor: "background.default",
				zIndex: 1,
			}}
		>
			<Box
				component={Link}
				href="/catalog"
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1.5,
					textDecoration: "none",
					color: "inherit",
				}}
			>
				<Box
					sx={{
						width: 28,
						height: 28,
						borderRadius: 1.5,
						bgcolor: "primary.main",
						color: "primary.contrastText",
						display: "grid",
						placeItems: "center",
						fontWeight: 700,
						fontSize: 14,
					}}
				>
					H
				</Box>
				<Box sx={{ fontWeight: 700 }}>Heimdal</Box>
			</Box>
			<Box sx={{ flex: 1 }} />
			<Button component={Link} href="/login" variant="outlined" size="small">
				Sign in
			</Button>
		</Box>
	);
}
