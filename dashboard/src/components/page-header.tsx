import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
	return (
		<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
			<Stack
				direction="row"
				spacing={2}
				sx={{
					maxWidth: 1024,
					mx: "auto",
					px: { xs: 3, md: 5 },
					py: 5,
					alignItems: "flex-start",
					justifyContent: "space-between",
				}}
			>
				<Box>
					<Typography variant="h1" component="h1">
						{title}
					</Typography>
					{description ? (
						<Typography
							variant="body2"
							sx={{ mt: 1.5, maxWidth: 640, color: "text.secondary" }}
						>
							{description}
						</Typography>
					) : null}
				</Box>
				{actions ? <Box sx={{ flexShrink: 0, pt: 0.5 }}>{actions}</Box> : null}
			</Stack>
		</Box>
	);
}

export function PageContainer({ children }: { children: ReactNode }) {
	return (
		<Box sx={{ maxWidth: 1024, mx: "auto", px: { xs: 3, md: 5 }, py: 5 }}>
			{children}
		</Box>
	);
}
