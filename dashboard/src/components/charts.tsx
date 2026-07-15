"use client";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { UsageSeriesPoint } from "@/lib/api";
import { formatCompact, formatNumber, formatShortDate } from "@/lib/format";

const tooltipStyle = {
	borderRadius: 8,
	border: "1px solid #e5e7eb",
	fontSize: 12,
	boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

export function CostChart({ series }: { series: UsageSeriesPoint[] }) {
	const data = series.map((p) => ({
		date: p.date,
		cost: p.costMicroUsd / 1_000_000,
	}));

	return (
		<ResponsiveContainer width="100%" height={240}>
			<AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
				<defs>
					<linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#111827" stopOpacity={0.12} />
						<stop offset="100%" stopColor="#111827" stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid stroke="#f3f4f6" vertical={false} />
				<XAxis
					dataKey="date"
					tickFormatter={formatShortDate}
					tick={{ fontSize: 11, fill: "#9ca3af" }}
					axisLine={false}
					tickLine={false}
					minTickGap={24}
				/>
				<YAxis
					tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
					tick={{ fontSize: 11, fill: "#9ca3af" }}
					axisLine={false}
					tickLine={false}
					width={52}
				/>
				<Tooltip
					formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
					labelFormatter={(label) => formatShortDate(String(label))}
					contentStyle={tooltipStyle}
				/>
				<Area
					type="monotone"
					dataKey="cost"
					stroke="#111827"
					strokeWidth={2}
					fill="url(#costFill)"
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}

export function TokensChart({ series }: { series: UsageSeriesPoint[] }) {
	const data = series.map((p) => ({
		date: p.date,
		prompt: p.promptTokens,
		completion: p.completionTokens,
	}));

	return (
		<ResponsiveContainer width="100%" height={240}>
			<BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
				<CartesianGrid stroke="#f3f4f6" vertical={false} />
				<XAxis
					dataKey="date"
					tickFormatter={formatShortDate}
					tick={{ fontSize: 11, fill: "#9ca3af" }}
					axisLine={false}
					tickLine={false}
					minTickGap={24}
				/>
				<YAxis
					tickFormatter={(v) => formatCompact(Number(v))}
					tick={{ fontSize: 11, fill: "#9ca3af" }}
					axisLine={false}
					tickLine={false}
					width={52}
				/>
				<Tooltip
					formatter={(value, name) => [
						formatNumber(Number(value)),
						name === "prompt" ? "Prompt" : "Completion",
					]}
					labelFormatter={(label) => formatShortDate(String(label))}
					contentStyle={tooltipStyle}
				/>
				<Bar dataKey="prompt" stackId="tokens" fill="#111827" />
				<Bar
					dataKey="completion"
					stackId="tokens"
					fill="#9ca3af"
					radius={[2, 2, 0, 0]}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
