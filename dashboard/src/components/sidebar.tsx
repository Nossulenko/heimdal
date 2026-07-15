"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	BarChart3,
	Boxes,
	Cable,
	CreditCard,
	KeyRound,
	LayoutDashboard,
	LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { clearSession, getOrg, type Org } from "@/lib/auth";

const nav = [
	{ href: "/", label: "Overview", icon: LayoutDashboard },
	{ href: "/keys", label: "API Keys", icon: KeyRound },
	{ href: "/usage", label: "Usage", icon: BarChart3 },
	{ href: "/models", label: "Models", icon: Boxes },
	{ href: "/credentials", label: "Provider Keys", icon: Cable },
	{ href: "/billing", label: "Billing", icon: CreditCard },
] as const;

function isActive(pathname: string, href: string): boolean {
	return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
	const pathname = usePathname();
	return (
		<aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-gray-200 bg-[#fbfbfa]">
			<div className="flex h-14 items-center gap-2 px-4">
				<div className="flex h-6 w-6 items-center justify-center rounded bg-gray-900 text-xs font-bold text-white">
					r
				</div>
				<span className="text-sm font-semibold text-gray-800">relaygw</span>
			</div>

			<nav className="flex-1 space-y-0.5 px-2 py-2">
				{nav.map((item) => {
					const active = isActive(pathname, item.href);
					const Icon = item.icon;
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
								active
									? "bg-gray-200/70 font-medium text-gray-900"
									: "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
							)}
						>
							<Icon className="h-4 w-4 shrink-0" />
							{item.label}
						</Link>
					);
				})}
			</nav>

			<SidebarFooter />
		</aside>
	);
}

function SidebarFooter() {
	const router = useRouter();
	const [org, setOrg] = useState<Org | null>(null);

	useEffect(() => {
		setOrg(getOrg());
	}, []);

	function logout() {
		clearSession();
		router.replace("/login");
	}

	return (
		<div className="border-t border-gray-200 p-2">
			<div className="flex items-center justify-between rounded-md px-2.5 py-1.5">
				<div className="min-w-0">
					<div className="truncate text-sm font-medium text-gray-800">
						{org?.name ?? "Workspace"}
					</div>
					<div className="truncate text-xs text-gray-400">Free plan</div>
				</div>
				<button
					type="button"
					onClick={logout}
					title="Log out"
					aria-label="Log out"
					className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
				>
					<LogOut className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
