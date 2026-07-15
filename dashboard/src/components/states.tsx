import Link from "next/link";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { ApiError } from "@/lib/api";

const shell = {
	borderRadius: 2,
	border: 1,
	borderColor: "divider",
	bgcolor: "background.paper",
	px: 4,
	py: 8,
} as const;

export function LoadingState({ label = "Loading…" }: { label?: string }) {
	return (
		<Stack
			direction="row"
			spacing={1.5}
			sx={{ ...shell, alignItems: "center", justifyContent: "center" }}
		>
			<CircularProgress size={16} thickness={5} sx={{ color: "text.disabled" }} />
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				{label}
			</Typography>
		</Stack>
	);
}

export function ErrorState({ error }: { error: unknown }) {
	const isAuth = error instanceof ApiError && error.status === 401;
	const message =
		error instanceof Error ? error.message : "Something went wrong.";
	return (
		<Stack
			spacing={0.75}
			sx={{ ...shell, alignItems: "center", textAlign: "center" }}
		>
			<ErrorOutlineIcon sx={{ color: "text.disabled", fontSize: 22 }} />
			<Typography variant="subtitle2" sx={{ color: "text.primary" }}>
				{isAuth ? "Your session has expired" : "Couldn’t load this data"}
			</Typography>
			<Typography variant="body2" sx={{ maxWidth: 360, color: "text.secondary" }}>
				{isAuth ? "Please sign in again to continue." : message}
			</Typography>
			{isAuth ? (
				<MuiLink component={Link} href="/login" sx={{ mt: 1, color: "primary.main" }}>
					Go to login
				</MuiLink>
			) : null}
		</Stack>
	);
}

export function EmptyState({
	title,
	description,
	action,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<Stack
			spacing={0.75}
			sx={{
				...shell,
				borderStyle: "dashed",
				alignItems: "center",
				textAlign: "center",
			}}
		>
			<InboxOutlinedIcon sx={{ color: "text.disabled", fontSize: 22 }} />
			<Typography variant="subtitle2" sx={{ color: "text.primary" }}>
				{title}
			</Typography>
			{description ? (
				<Typography variant="body2" sx={{ maxWidth: 360, color: "text.secondary" }}>
					{description}
				</Typography>
			) : null}
			{action ? <Box sx={{ mt: 1 }}>{action}</Box> : null}
		</Stack>
	);
}
