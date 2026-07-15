"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import CableOutlinedIcon from "@mui/icons-material/CableOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import WidgetsOutlinedIcon from "@mui/icons-material/WidgetsOutlined";
import { clearSession, getOrg, type Org } from "@/lib/auth";

export const SIDEBAR_WIDTH = 240;

const nav = [
	{ href: "/", label: "Overview", Icon: DashboardOutlinedIcon },
	{ href: "/keys", label: "API Keys", Icon: VpnKeyOutlinedIcon },
	{ href: "/usage", label: "Usage", Icon: BarChartOutlinedIcon },
	{ href: "/models", label: "Models", Icon: WidgetsOutlinedIcon },
	{ href: "/credentials", label: "Provider Keys", Icon: CableOutlinedIcon },
	{ href: "/billing", label: "Billing", Icon: CreditCardOutlinedIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
	return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
	const pathname = usePathname();
	return (
		<Box
			component="aside"
			sx={{
				position: "fixed",
				insetBlock: 0,
				left: 0,
				zIndex: (t) => t.zIndex.appBar,
				width: SIDEBAR_WIDTH,
				display: "flex",
				flexDirection: "column",
				borderRight: 1,
				borderColor: "divider",
				bgcolor: "background.default",
			}}
		>
			<Stack
				direction="row"
				spacing={1.25}
				sx={{ alignItems: "center", height: 56, px: 2 }}
			>
				<Box
					sx={{
						width: 26,
						height: 26,
						borderRadius: 1.5,
						bgcolor: "primary.main",
						color: "primary.contrastText",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: 13,
						fontWeight: 700,
					}}
				>
					H
				</Box>
				<Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
					Heimdal
				</Typography>
			</Stack>

			<List sx={{ flex: 1, px: 1, py: 1 }}>
				{nav.map(({ href, label, Icon }) => {
					const active = isActive(pathname, href);
					return (
						<ListItem key={href} disablePadding sx={{ mb: 0.25 }}>
							<ListItemButton component={Link} href={href} selected={active} dense>
								<ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
									<Icon sx={{ fontSize: 18 }} />
								</ListItemIcon>
								<ListItemText
									primary={label}
									slotProps={{
										primary: {
											sx: { fontSize: "0.875rem", fontWeight: "inherit" },
										},
									}}
								/>
							</ListItemButton>
						</ListItem>
					);
				})}
			</List>

			<SidebarFooter />
		</Box>
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
		<>
			<Divider />
			<Stack
				direction="row"
				spacing={1}
				sx={{ alignItems: "center", justifyContent: "space-between", p: 1.5 }}
			>
				<Box sx={{ minWidth: 0 }}>
					<Typography
						noWrap
						sx={{ fontSize: "0.875rem", fontWeight: 500, color: "text.primary" }}
					>
						{org?.name ?? "Workspace"}
					</Typography>
					<Typography noWrap variant="caption" sx={{ color: "text.disabled" }}>
						Free plan
					</Typography>
				</Box>
				<Tooltip title="Log out">
					<IconButton
						size="small"
						onClick={logout}
						aria-label="Log out"
						sx={{ color: "text.secondary" }}
					>
						<LogoutOutlinedIcon sx={{ fontSize: 18 }} />
					</IconButton>
				</Tooltip>
			</Stack>
		</>
	);
}
