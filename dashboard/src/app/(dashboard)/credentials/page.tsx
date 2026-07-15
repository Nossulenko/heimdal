"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { TD, Table, TH, THead, TR } from "@/components/ui/table";
import type { Credential } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
	useCreateCredential,
	useCredentials,
	useDeleteCredential,
} from "@/lib/hooks";

const PROVIDERS = [
	{ value: "openai", label: "OpenAI" },
	{ value: "anthropic", label: "Anthropic" },
	{ value: "google", label: "Google" },
] as const;

function providerLabel(value: string): string {
	return PROVIDERS.find((p) => p.value === value)?.label ?? value;
}

export default function CredentialsPage() {
	const credentials = useCredentials();
	const createCredential = useCreateCredential();
	const deleteCredential = useDeleteCredential();

	const [addOpen, setAddOpen] = useState(false);
	const [provider, setProvider] = useState<string>(PROVIDERS[0].value);
	const [apiKey, setApiKey] = useState("");
	const [toDelete, setToDelete] = useState<Credential | null>(null);

	async function submitAdd(e: FormEvent) {
		e.preventDefault();
		const trimmed = apiKey.trim();
		if (!trimmed) return;
		await createCredential.mutateAsync({ provider, apiKey: trimmed });
		closeAdd();
	}

	function closeAdd() {
		setAddOpen(false);
		setProvider(PROVIDERS[0].value);
		setApiKey("");
		createCredential.reset();
	}

	async function confirmDelete() {
		if (!toDelete) return;
		await deleteCredential.mutateAsync(toDelete.id);
		setToDelete(null);
	}

	return (
		<>
			<PageHeader
				icon="🔌"
				title="Provider Keys"
				description="Upstream provider secrets used to fulfill requests. Secrets are write-only — they’re never shown again after saving."
				actions={
					<Button variant="primary" onClick={() => setAddOpen(true)}>
						<Plus className="h-4 w-4" />
						Add provider key
					</Button>
				}
			/>
			<PageContainer>
				{credentials.isLoading ? (
					<LoadingState />
				) : credentials.isError ? (
					<ErrorState error={credentials.error} />
				) : credentials.data && credentials.data.length > 0 ? (
					<Table>
						<THead>
							<tr>
								<TH>Provider</TH>
								<TH>Secret</TH>
								<TH>Added</TH>
								<TH>Status</TH>
								<TH className="text-right">Actions</TH>
							</tr>
						</THead>
						<tbody>
							{credentials.data.map((c) => {
								const revoked = Boolean(c.revokedAt);
								return (
									<TR key={c.id}>
										<TD className="font-medium text-gray-800">
											{providerLabel(c.provider)}
										</TD>
										<TD>
											<code className="font-mono text-xs text-gray-400">
												••••••••••••••••
											</code>
										</TD>
										<TD>{formatDate(c.createdAt)}</TD>
										<TD>
											{revoked ? (
												<Badge tone="red">Revoked</Badge>
											) : (
												<Badge tone="green">Active</Badge>
											)}
										</TD>
										<TD className="text-right">
											{revoked ? (
												<span className="text-xs text-gray-300">—</span>
											) : (
												<Button
													variant="danger"
													size="sm"
													onClick={() => setToDelete(c)}
												>
													Delete
												</Button>
											)}
										</TD>
									</TR>
								);
							})}
						</tbody>
					</Table>
				) : (
					<EmptyState
						title="No provider keys yet"
						description="Add an upstream provider secret so the gateway can route requests."
						action={
							<Button variant="primary" onClick={() => setAddOpen(true)}>
								<Plus className="h-4 w-4" />
								Add provider key
							</Button>
						}
					/>
				)}
			</PageContainer>

			<Modal open={addOpen} onClose={closeAdd} title="Add provider key">
				<form onSubmit={submitAdd} className="space-y-3">
					<div>
						<label
							htmlFor="provider"
							className="mb-1 block text-sm font-medium text-gray-700"
						>
							Provider
						</label>
						<Select
							id="provider"
							value={provider}
							onChange={(e) => setProvider(e.target.value)}
						>
							{PROVIDERS.map((p) => (
								<option key={p.value} value={p.value}>
									{p.label}
								</option>
							))}
						</Select>
					</div>
					<div>
						<label
							htmlFor="secret"
							className="mb-1 block text-sm font-medium text-gray-700"
						>
							API key
						</label>
						<Input
							id="secret"
							type="password"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							placeholder="sk-…"
							autoComplete="off"
							required
						/>
						<p className="mt-1.5 text-xs text-gray-400">
							Stored securely and never displayed again.
						</p>
					</div>
					{createCredential.isError ? (
						<p className="text-sm text-red-600">
							{createCredential.error instanceof Error
								? createCredential.error.message
								: "Could not save provider key."}
						</p>
					) : null}
					<div className="flex justify-end gap-2 pt-2">
						<Button
							variant="secondary"
							onClick={closeAdd}
							disabled={createCredential.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={createCredential.isPending || !apiKey.trim()}
						>
							{createCredential.isPending ? "Saving…" : "Save key"}
						</Button>
					</div>
				</form>
			</Modal>

			<ConfirmDialog
				open={Boolean(toDelete)}
				title="Delete provider key"
				message={`Delete the ${providerLabel(toDelete?.provider ?? "")} key? The gateway will no longer be able to route to this provider with it.`}
				confirmLabel="Delete key"
				loading={deleteCredential.isPending}
				onConfirm={confirmDelete}
				onClose={() => setToDelete(null)}
			/>
		</>
	);
}
