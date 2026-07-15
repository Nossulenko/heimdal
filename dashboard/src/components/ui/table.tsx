import type {
	HTMLAttributes,
	TableHTMLAttributes,
	TdHTMLAttributes,
	ThHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export function Table({
	className,
	...props
}: TableHTMLAttributes<HTMLTableElement>) {
	return (
		<div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
			<table
				className={cn("w-full border-collapse text-sm", className)}
				{...props}
			/>
		</div>
	);
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
	return <thead className="border-b border-gray-200 bg-gray-50/70" {...props} />;
}

export function TH({
	className,
	...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
	return (
		<th
			className={cn(
				"px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500",
				className,
			)}
			{...props}
		/>
	);
}

export function TR({
	className,
	...props
}: HTMLAttributes<HTMLTableRowElement>) {
	return (
		<tr
			className={cn(
				"border-b border-gray-100 last:border-0 hover:bg-gray-50/50",
				className,
			)}
			{...props}
		/>
	);
}

export function TD({
	className,
	...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
	return (
		<td
			className={cn("px-4 py-3 align-middle text-gray-700", className)}
			{...props}
		/>
	);
}
