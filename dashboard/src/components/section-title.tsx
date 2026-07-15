import type { ReactNode } from "react";
import Typography from "@mui/material/Typography";

export function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<Typography
			variant="h6"
			component="h2"
			sx={{ mb: 1.5, color: "text.secondary" }}
		>
			{children}
		</Typography>
	);
}
