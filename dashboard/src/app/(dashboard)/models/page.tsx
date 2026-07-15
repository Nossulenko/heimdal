"use client";

import { PageContainer, PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { TD, Table, TH, THead, TR } from "@/components/ui/table";
import { formatPricePerMillion } from "@/lib/format";
import { useModels } from "@/lib/hooks";

export default function ModelsPage() {
	const models = useModels();

	return (
		<>
			<PageHeader
				icon="🧠"
				title="Models"
				description="The model registry your gateway can route to. Prices are shown per 1M tokens."
			/>
			<PageContainer>
				{models.isLoading ? (
					<LoadingState />
				) : models.isError ? (
					<ErrorState error={models.error} />
				) : models.data && models.data.length > 0 ? (
					<Table>
						<THead>
							<tr>
								<TH>Logical name</TH>
								<TH>Provider</TH>
								<TH>Provider model ID</TH>
								<TH className="text-right">Input / 1M</TH>
								<TH className="text-right">Output / 1M</TH>
								<TH>Status</TH>
							</tr>
						</THead>
						<tbody>
							{models.data.map((m) => (
								<TR key={`${m.provider}/${m.logicalName}`}>
									<TD className="font-medium text-gray-800">{m.logicalName}</TD>
									<TD>
										<Badge tone="blue">{m.provider}</Badge>
									</TD>
									<TD>
										<code className="font-mono text-xs text-gray-500">
											{m.providerModelId}
										</code>
									</TD>
									<TD className="text-right tabular-nums">
										{formatPricePerMillion(m.inputPricePerToken)}
									</TD>
									<TD className="text-right tabular-nums">
										{formatPricePerMillion(m.outputPricePerToken)}
									</TD>
									<TD>
										{m.active ? (
											<Badge tone="green">Active</Badge>
										) : (
											<Badge tone="gray">Inactive</Badge>
										)}
									</TD>
								</TR>
							))}
						</tbody>
					</Table>
				) : (
					<EmptyState
						title="No models configured"
						description="Your gateway’s model registry is empty."
					/>
				)}
			</PageContainer>
		</>
	);
}
