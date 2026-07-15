import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "gray" | "green" | "red" | "blue" | "amber";

const tones: Record<Tone, string> = {
	gray: "bg-gray-100 text-gray-600",
	green: "bg-green-50 text-green-700",
	red: "bg-red-50 text-red-600",
	blue: "bg-blue-50 text-blue-700",
	amber: "bg-amber-50 text-amber-700",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	tone?: Tone;
}

export function Badge({ tone = "gray", className, ...props }: BadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
				tones[tone],
				className,
			)}
			{...props}
		/>
	);
}
