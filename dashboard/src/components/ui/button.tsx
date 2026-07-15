import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
}

const variants: Record<Variant, string> = {
	primary: "bg-gray-900 text-white hover:bg-gray-800 border border-transparent",
	secondary:
		"bg-white text-gray-800 hover:bg-gray-50 border border-gray-200",
	ghost: "bg-transparent text-gray-600 hover:bg-gray-100 border border-transparent",
	danger: "bg-white text-red-600 hover:bg-red-50 border border-gray-200",
};

const sizes: Record<Size, string> = {
	sm: "h-8 px-2.5 text-sm",
	md: "h-9 px-4 text-sm",
};

export function Button({
	variant = "secondary",
	size = "md",
	className,
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={cn(
				"inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50",
				variants[variant],
				sizes[size],
				className,
			)}
			{...props}
		/>
	);
}
