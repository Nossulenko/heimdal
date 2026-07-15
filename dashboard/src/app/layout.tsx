import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "./globals.css";
import theme from "@/theme";
import { Providers } from "./providers";

export const metadata: Metadata = {
	title: "Heimdal · dashboard",
	description: "Dashboard for the Heimdal self-hostable LLM gateway.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>
				<AppRouterCacheProvider options={{ key: "mui" }}>
					<ThemeProvider theme={theme}>
						<CssBaseline />
						<Providers>{children}</Providers>
					</ThemeProvider>
				</AppRouterCacheProvider>
			</body>
		</html>
	);
}
