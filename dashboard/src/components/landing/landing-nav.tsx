"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import GitHubIcon from "@mui/icons-material/GitHub";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import type { ReactNode } from "react";
import { DOCS_URL, GITHUB_URL } from "./constants";
import { LogoMark } from "./logo-mark";

function NavLink({
	href,
	external,
	children,
}: {
	href: string;
	external?: boolean;
	children: ReactNode;
}) {
	return (
		<Box
			component={Link}
			href={href}
			{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.5,
				px: 1.25,
				py: 0.5,
				borderRadius: 1.5,
				fontSize: "0.9rem",
				fontWeight: 500,
				color: "text.secondary",
				textDecoration: "none",
				transition: "color .15s, background-color .15s",
				"&:hover": { color: "text.primary", bgcolor: "action.hover" },
			}}
		>
			{children}
		</Box>
	);
}

/** LandingNav is the sticky top bar for the public marketing page. */
export function LandingNav() {
	return (
		<Box
			component="header"
			sx={{
				position: "sticky",
				top: 0,
				zIndex: 20,
				borderBottom: "1px solid",
				borderColor: "divider",
				backdropFilter: "saturate(180%) blur(8px)",
				bgcolor: "rgba(250, 250, 250, 0.82)",
			}}
		>
			<Container maxWidth="lg">
				<Box
					sx={{
						height: 62,
						display: "flex",
						alignItems: "center",
						gap: 1.5,
					}}
				>
					<Box
						component={Link}
						href="/"
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1.25,
							textDecoration: "none",
							color: "inherit",
						}}
					>
						<LogoMark />
						<Box sx={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>
							Heimdal
						</Box>
					</Box>

					<Stack
						direction="row"
						spacing={0.25}
						sx={{ ml: 2, display: { xs: "none", md: "flex" } }}
					>
						<NavLink href="/catalog">Models</NavLink>
						<NavLink href={DOCS_URL} external>
							Docs
						</NavLink>
						<NavLink href={GITHUB_URL} external>
							<GitHubIcon sx={{ fontSize: 17 }} />
							GitHub
							<StarRoundedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
						</NavLink>
					</Stack>

					<Box sx={{ flex: 1 }} />

					<Button
						component={Link}
						href="/login"
						variant="outlined"
						size="small"
						sx={{ display: { xs: "none", sm: "inline-flex" } }}
					>
						Sign in
					</Button>
					<Button component={Link} href="/login" variant="contained" size="small">
						Get started
					</Button>
				</Box>
			</Container>
		</Box>
	);
}
