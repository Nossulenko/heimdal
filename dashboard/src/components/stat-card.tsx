import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface StatCardProps {
	label: string;
	value: string;
	sub?: string;
	icon?: ReactNode;
}

export function StatCard({ label, value, sub, icon }: StatCardProps) {
	return (
		<Card sx={{ p: 2.5 }}>
			<Stack
				direction="row"
				sx={{ alignItems: "center", justifyContent: "space-between" }}
			>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{label}
				</Typography>
				{icon ? (
					<Box sx={{ color: "text.disabled", display: "flex" }}>{icon}</Box>
				) : null}
			</Stack>
			<Typography
				variant="h2"
				sx={{ mt: 1.5, fontWeight: 600, color: "text.primary" }}
			>
				{value}
			</Typography>
			<Typography
				variant="caption"
				sx={{ mt: 0.5, minHeight: 18, display: "block", color: "text.disabled" }}
			>
				{sub ?? ""}
			</Typography>
		</Card>
	);
}
