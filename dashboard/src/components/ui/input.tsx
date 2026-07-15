import { forwardRef } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
	function Input({ className, ...props }, ref) {
		return (
			<input
				ref={ref}
				className={cn(
					"h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100",
					className,
				)}
				{...props}
			/>
		);
	},
);

export const Select = forwardRef<
	HTMLSelectElement,
	SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
	return (
		<select
			ref={ref}
			className={cn(
				"h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100",
				className,
			)}
			{...props}
		/>
	);
});
