"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { HeimdalMark } from "@/components/heimdal-mark";
import { api, ApiError, USE_MOCKS } from "@/lib/api";
import { getToken, setSession } from "@/lib/auth";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (getToken()) router.replace("/overview");
	}, [router]);

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await api.login(email, password);
			setSession(res.token, res.org);
			router.replace("/overview");
			router.refresh();
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: "Login failed. Check your credentials and try again.",
			);
			setLoading(false);
		}
	}

	return (
		<Box
			sx={{
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				bgcolor: "background.default",
				px: 2,
			}}
		>
			<Box sx={{ width: "100%", maxWidth: 380 }}>
				<Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 3 }}>
					<HeimdalMark size={30} />
					<Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
						Heimdal
					</Typography>
				</Stack>

				<Card sx={{ p: 3 }}>
					<Typography variant="h4" component="h1">
						Sign in
					</Typography>
					<Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
						Access your gateway dashboard.
					</Typography>

					<Box component="form" onSubmit={onSubmit} sx={{ mt: 3 }}>
						<Stack spacing={2}>
							<TextField
								id="email"
								label="Email"
								type="email"
								size="small"
								fullWidth
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@company.com"
								autoComplete="email"
								required
							/>
							<TextField
								id="password"
								label="Password"
								type="password"
								size="small"
								fullWidth
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								autoComplete="current-password"
								required
							/>
							{error ? (
								<Alert severity="error" sx={{ py: 0 }}>
									{error}
								</Alert>
							) : null}
							<Button
								type="submit"
								variant="contained"
								fullWidth
								disabled={loading}
							>
								{loading ? "Signing in…" : "Sign in"}
							</Button>
						</Stack>
					</Box>

					{USE_MOCKS ? (
						<Typography
							variant="caption"
							sx={{
								display: "block",
								mt: 2.5,
								textAlign: "center",
								color: "text.disabled",
							}}
						>
							Mock mode is on — any email &amp; password will sign you in.
						</Typography>
					) : null}
				</Card>
			</Box>
		</Box>
	);
}
