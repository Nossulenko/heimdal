"use client";

import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import type { UsageSeriesPoint } from "@/lib/api";
import { formatCompact, formatNumber, formatShortDate } from "@/lib/format";
import { chartPalette } from "@/theme";

const CHART_HEIGHT = 260;

const axisSx = {
	"& .MuiChartsAxis-tickLabel": { fontSize: 11, fill: "#9a9a9a" },
	"& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { display: "none" },
	"& .MuiChartsGrid-line": { stroke: chartPalette.grid, strokeDasharray: "0" },
} as const;

function shortDate(value: string | null): string {
	return value ? formatShortDate(value) : "";
}

export function CostChart({ series }: { series: UsageSeriesPoint[] }) {
	const dates = series.map((p) => p.date);
	const costs = series.map((p) => p.costMicroUsd / 1_000_000);

	return (
		<LineChart
			height={CHART_HEIGHT}
			hideLegend
			grid={{ horizontal: true }}
			margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
			xAxis={[
				{
					data: dates,
					scaleType: "point",
					valueFormatter: shortDate,
					tickLabelStyle: { fontSize: 11 },
				},
			]}
			yAxis={[
				{
					width: 52,
					valueFormatter: (v: number) => `$${v.toFixed(2)}`,
				},
			]}
			series={[
				{
					data: costs,
					label: "Cost",
					color: chartPalette.ink,
					area: true,
					showMark: false,
					curve: "monotoneX",
					valueFormatter: (v) =>
						v == null ? "" : `$${v.toFixed(4)}`,
				},
			]}
			sx={{
				...axisSx,
				"& .MuiAreaElement-root": { fillOpacity: 0.08 },
			}}
		/>
	);
}

export function TokensChart({ series }: { series: UsageSeriesPoint[] }) {
	const dates = series.map((p) => p.date);
	const prompt = series.map((p) => p.promptTokens);
	const completion = series.map((p) => p.completionTokens);

	return (
		<BarChart
			height={CHART_HEIGHT}
			grid={{ horizontal: true }}
			margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
			borderRadius={3}
			xAxis={[
				{
					data: dates,
					scaleType: "band",
					valueFormatter: shortDate,
					tickLabelStyle: { fontSize: 11 },
				},
			]}
			yAxis={[
				{
					width: 52,
					valueFormatter: (v: number) => formatCompact(v),
				},
			]}
			series={[
				{
					data: prompt,
					label: "Prompt",
					stack: "tokens",
					color: chartPalette.ink,
					valueFormatter: (v) => (v == null ? "" : formatNumber(v)),
				},
				{
					data: completion,
					label: "Completion",
					stack: "tokens",
					color: chartPalette.muted,
					valueFormatter: (v) => (v == null ? "" : formatNumber(v)),
				},
			]}
			slotProps={{
				legend: {
					position: { vertical: "top", horizontal: "start" },
					sx: { fontSize: 12 },
				},
			}}
			sx={axisSx}
		/>
	);
}
