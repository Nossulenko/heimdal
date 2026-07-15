import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface PageHeaderProps {
	icon: string;
	title: string;
	description?: string;
	actions?: ReactNode;
}

export function PageHeader({ icon, title, description, actions }: PageHeaderProps) {
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
					<Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
						<Box component="span" sx={{ fontSize: 28, lineHeight: 1 }}>
							{icon}
						</Box>
						<Typography variant="h1" component="h1">
							{title}
						</Typography>
					</Stack>
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
