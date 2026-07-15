import Link from "next/link";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
	return (
		<div className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-16 text-sm text-gray-400">
			<Loader2 className="h-4 w-4 animate-spin" />
			{label}
		</div>
	);
}

export function ErrorState({ error }: { error: unknown }) {
	const isAuth = error instanceof ApiError && error.status === 401;
	const message = error instanceof Error ? error.message : "Something went wrong.";
	return (
		<div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-16 text-center">
			<AlertCircle className="h-5 w-5 text-gray-400" />
			<p className="text-sm font-medium text-gray-700">
				{isAuth ? "Your session has expired" : "Couldn’t load this data"}
			</p>
			<p className="max-w-sm text-sm text-gray-400">
				{isAuth ? "Please sign in again to continue." : message}
			</p>
			{isAuth ? (
				<Link
					href="/login"
					className="mt-2 text-sm font-medium text-gray-900 underline underline-offset-2"
				>
					Go to login
				</Link>
			) : null}
		</div>
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
		<div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-200 bg-white px-4 py-16 text-center">
			<Inbox className="h-5 w-5 text-gray-300" />
			<p className="text-sm font-medium text-gray-700">{title}</p>
			{description ? (
				<p className="max-w-sm text-sm text-gray-400">{description}</p>
			) : null}
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	);
}
