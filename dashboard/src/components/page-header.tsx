import type { ReactNode } from "react";

interface PageHeaderProps {
	icon: string;
	title: string;
	description?: string;
	actions?: ReactNode;
}

export function PageHeader({ icon, title, description, actions }: PageHeaderProps) {
	return (
		<div className="border-b border-gray-200">
			<div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-8 py-8">
				<div>
					<div className="flex items-center gap-3">
						<span className="text-3xl leading-none">{icon}</span>
						<h1 className="text-2xl font-semibold tracking-tight text-gray-900">
							{title}
						</h1>
					</div>
					{description ? (
						<p className="mt-2 max-w-2xl text-sm text-gray-500">{description}</p>
					) : null}
				</div>
				{actions ? <div className="shrink-0 pt-1">{actions}</div> : null}
			</div>
		</div>
	);
}

export function PageContainer({ children }: { children: ReactNode }) {
	return <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>;
}
