"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError, USE_MOCKS } from "@/lib/api";
import { getToken, setSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (getToken()) router.replace("/");
	}, [router]);

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await api.login(email, password);
			setSession(res.token, res.org);
			router.replace("/");
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
		<div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4">
			<div className="w-full max-w-sm">
				<div className="mb-6 flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded bg-gray-900 text-sm font-bold text-white">
						r
					</div>
					<span className="text-lg font-semibold text-gray-900">relaygw</span>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6">
					<h1 className="text-lg font-semibold text-gray-900">Sign in</h1>
					<p className="mt-1 text-sm text-gray-500">
						Access your gateway dashboard.
					</p>

					<form onSubmit={onSubmit} className="mt-5 space-y-3">
						<div>
							<label
								htmlFor="email"
								className="mb-1 block text-sm font-medium text-gray-700"
							>
								Email
							</label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@company.com"
								autoComplete="email"
								required
							/>
						</div>
						<div>
							<label
								htmlFor="password"
								className="mb-1 block text-sm font-medium text-gray-700"
							>
								Password
							</label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								autoComplete="current-password"
								required
							/>
						</div>
						{error ? <p className="text-sm text-red-600">{error}</p> : null}
						<Button
							type="submit"
							variant="primary"
							className="w-full"
							disabled={loading}
						>
							{loading ? "Signing in…" : "Sign in"}
						</Button>
					</form>

					{USE_MOCKS ? (
						<p className="mt-4 text-center text-xs text-gray-400">
							Mock mode is on — any email &amp; password will sign you in.
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
