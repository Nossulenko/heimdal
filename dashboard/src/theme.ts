"use client";

import { createTheme } from "@mui/material/styles";

/**
 * Centralised palette for the Heimdal dashboard. Everything else in the app
 * pulls colour and spacing from the theme (or the `sx` prop) — no scattered
 * hex values in components.
 */
const colors = {
	ink: "#111111",
	text: "#1a1a1a",
	textMuted: "#6b6b6b",
	textFaint: "#9a9a9a",
	border: "#e5e5e5",
	borderStrong: "#d4d4d4",
	bg: "#fafafa",
	paper: "#ffffff",
	hover: "#f4f4f3",
	activeBg: "#ececeb",
	sidebar: "#fbfbfa",
	dangerText: "#c0392b",
	dangerBg: "#fdecea",
	successText: "#1b7a4b",
	successBg: "#e7f4ec",
	warnText: "#8a5a00",
	warnBg: "#fbf1dd",
	infoText: "#2456a6",
	infoBg: "#e8f0fb",
};

const fontStack = [
	"Inter",
	"system-ui",
	"-apple-system",
	"BlinkMacSystemFont",
	'"Segoe UI"',
	"Roboto",
	'"Helvetica Neue"',
	"Arial",
	"sans-serif",
].join(",");

const theme = createTheme({
	palette: {
		mode: "light",
		primary: { main: colors.ink, contrastText: "#ffffff" },
		background: { default: colors.bg, paper: colors.paper },
		text: { primary: colors.text, secondary: colors.textMuted },
		divider: colors.border,
		error: { main: colors.dangerText },
		success: { main: colors.successText },
		warning: { main: colors.warnText },
		info: { main: colors.infoText },
	},
	shape: { borderRadius: 8 },
	typography: {
		fontFamily: fontStack,
		fontWeightMedium: 500,
		h1: { fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" },
		h2: { fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em" },
		h3: { fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.01em" },
		h4: { fontSize: "1.125rem", fontWeight: 600 },
		h5: { fontSize: "1rem", fontWeight: 600 },
		h6: { fontSize: "0.875rem", fontWeight: 600 },
		subtitle2: { fontWeight: 600 },
		body2: { fontSize: "0.875rem" },
		button: { textTransform: "none", fontWeight: 500 },
	},
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				body: {
					WebkitFontSmoothing: "antialiased",
					MozOsxFontSmoothing: "grayscale",
				},
				"::selection": { backgroundColor: "#dfe6ef" },
			},
		},
		MuiPaper: {
			defaultProps: { elevation: 0 },
			styleOverrides: {
				root: { backgroundImage: "none" },
				outlined: { borderColor: colors.border },
			},
		},
		MuiCard: {
			defaultProps: { variant: "outlined" },
			styleOverrides: {
				root: { borderColor: colors.border, borderRadius: 8 },
			},
		},
		MuiButton: {
			defaultProps: { disableElevation: true },
			styleOverrides: {
				root: { borderRadius: 8, boxShadow: "none" },
				sizeSmall: { paddingInline: 12, minHeight: 32 },
				sizeMedium: { minHeight: 36 },
				outlined: { borderColor: colors.border, color: colors.text },
			},
		},
		MuiOutlinedInput: {
			styleOverrides: {
				root: {
					borderRadius: 8,
					backgroundColor: colors.paper,
					"& .MuiOutlinedInput-notchedOutline": {
						borderColor: colors.border,
					},
					"&:hover .MuiOutlinedInput-notchedOutline": {
						borderColor: colors.borderStrong,
					},
				},
				input: { fontSize: "0.875rem" },
			},
		},
		MuiInputLabel: {
			styleOverrides: { root: { fontSize: "0.875rem" } },
		},
		MuiTableContainer: {
			styleOverrides: {
				root: {
					border: `1px solid ${colors.border}`,
					borderRadius: 8,
					backgroundColor: colors.paper,
				},
			},
		},
		MuiTableCell: {
			styleOverrides: {
				root: {
					borderColor: colors.border,
					fontSize: "0.875rem",
					paddingBlock: 12,
				},
				head: {
					color: colors.textMuted,
					fontWeight: 600,
					fontSize: "0.75rem",
					letterSpacing: "0.02em",
					backgroundColor: colors.bg,
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: { fontWeight: 500, borderRadius: 6 },
				sizeSmall: { height: 22, fontSize: "0.72rem" },
			},
		},
		MuiDialog: {
			styleOverrides: {
				paper: {
					borderRadius: 12,
					border: `1px solid ${colors.border}`,
					boxShadow: "0 12px 40px rgba(0,0,0,0.10)",
				},
			},
		},
		MuiTooltip: {
			styleOverrides: {
				tooltip: {
					backgroundColor: colors.ink,
					fontSize: "0.72rem",
					borderRadius: 6,
				},
			},
		},
		MuiListItemButton: {
			styleOverrides: {
				root: {
					borderRadius: 8,
					color: colors.textMuted,
					"&:hover": { backgroundColor: colors.hover, color: colors.text },
					"&.Mui-selected": {
						backgroundColor: colors.activeBg,
						color: colors.text,
						fontWeight: 500,
						"&:hover": { backgroundColor: colors.activeBg },
					},
				},
			},
		},
		MuiLink: {
			defaultProps: { underline: "hover" },
			styleOverrides: { root: { fontWeight: 500 } },
		},
	},
});

export const chartPalette = {
	ink: colors.ink,
	muted: colors.textFaint,
	grid: colors.border,
};

export const tone = {
	success: { color: colors.successText, bg: colors.successBg },
	danger: { color: colors.dangerText, bg: colors.dangerBg },
	warn: { color: colors.warnText, bg: colors.warnBg },
	info: { color: colors.infoText, bg: colors.infoBg },
	neutral: { color: colors.textMuted, bg: colors.hover },
};

export default theme;
