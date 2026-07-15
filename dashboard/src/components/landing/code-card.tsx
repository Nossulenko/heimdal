"use client";

import Box from "@mui/material/Box";
import { MONO } from "./constants";

const dotSx = { width: 10, height: 10, borderRadius: "50%" } as const;

/**
 * CodeCard renders the hero's example request as a small terminal-style card.
 * The `x-route` header and the "auto" model are lightly accented because they
 * are the whole point — one request, routed to the best model automatically.
 */
export function CodeCard() {
	return (
		<Box
			sx={{
				border: "1px solid",
				borderColor: "divider",
				borderRadius: 2.5,
				bgcolor: "background.paper",
				overflow: "hidden",
				boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)",
				width: "100%",
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1,
					px: 2,
					py: 1.25,
					borderBottom: "1px solid",
					borderColor: "divider",
					bgcolor: "background.default",
				}}
			>
				<Box sx={{ ...dotSx, bgcolor: "#e5e5e5" }} />
				<Box sx={{ ...dotSx, bgcolor: "#e5e5e5" }} />
				<Box sx={{ ...dotSx, bgcolor: "#e5e5e5" }} />
				<Box
					sx={{
						ml: 1,
						fontFamily: MONO,
						fontSize: "0.72rem",
						color: "text.disabled",
					}}
				>
					example request
				</Box>
			</Box>

			<Box
				component="pre"
				sx={{
					m: 0,
					px: { xs: 2, sm: 2.5 },
					py: 2.25,
					fontFamily: MONO,
					fontSize: { xs: "0.72rem", sm: "0.8rem" },
					lineHeight: 1.85,
					color: "text.primary",
					overflowX: "auto",
					whiteSpace: "pre",
				}}
			>
				<Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
					curl
				</Box>{" "}
				<Box component="span" sx={{ color: "text.secondary" }}>
					localhost:8080/v1/chat/completions
				</Box>{" "}
				<Box component="span" sx={{ color: "text.disabled" }}>
					{"\\"}
				</Box>
				{"\n  "}
				<Box component="span" sx={{ color: "text.disabled" }}>
					-H
				</Box>{" "}
				<Box component="span" sx={{ color: "success.main" }}>
					{'"Authorization: Bearer $KEY"'}
				</Box>{" "}
				<Box component="span" sx={{ color: "text.disabled" }}>
					{"\\"}
				</Box>
				{"\n  "}
				<Box component="span" sx={{ color: "text.disabled" }}>
					-H
				</Box>{" "}
				<Box component="span" sx={{ color: "info.main", fontWeight: 600 }}>
					{'"x-route: cost"'}
				</Box>{" "}
				<Box component="span" sx={{ color: "text.disabled" }}>
					{"\\"}
				</Box>
				{"\n  "}
				<Box component="span" sx={{ color: "text.disabled" }}>
					-d
				</Box>{" "}
				<Box component="span" sx={{ color: "text.secondary" }}>
					{'\'{"model":'}
				</Box>
				<Box component="span" sx={{ color: "info.main", fontWeight: 600 }}>
					{'"auto"'}
				</Box>
				<Box component="span" sx={{ color: "text.secondary" }}>
					{',"messages":[{"role":"user","content":"hello"}]}\''}
				</Box>
			</Box>
		</Box>
	);
}
