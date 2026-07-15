"use client";

import { Check, Copy, Plus } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { TD, Table, TH, THead, TR } from "@/components/ui/table";
import type { ApiKey, CreatedApiKey } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useCreateKey, useDeleteKey, useKeys } from "@/lib/hooks";

export default function KeysPage() {
	const keys = useKeys();
	const createKey = useCreateKey();
	const deleteKey = useDeleteKey();

	const [createOpen, setCreateOpen] = useState(false);
	const [name, setName] = useState("");
	const [created, setCreated] = useState<CreatedApiKey | null>(null);
	const [copied, setCopied] = useState(false);
	const [toRevoke, setToRevoke] = useState<ApiKey | null>(null);

	async function submitCreate(e: FormEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		const res = await createKey.mutateAsync(trimmed);
		setCreated(res);
	}

	function closeCreate() {
		setCreateOpen(false);
		setName("");
		setCreated(null);
		setCopied(false);
		createKey.reset();
	}

	async function copyPlaintext() {
		if (!created) return;
		try {
			await navigator.clipboard.writeText(created.plaintext);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	}

	async function confirmRevoke() {
		if (!toRevoke) return;
		await deleteKey.mutateAsync(toRevoke.id);
		setToRevoke(null);
	}

	return (
		<>
			<PageHeader
				icon="🔑"
				title="API Keys"
				description="Keys authenticate requests to your gateway. Treat them like passwords."
				actions={
					<Button variant="primary" onClick={() => setCreateOpen(true)}>
						<Plus className="h-4 w-4" />
						Create key
					</Button>
				}
			/>
			<PageContainer>
				{keys.isLoading ? (
					<LoadingState />
				) : keys.isError ? (
					<ErrorState error={keys.error} />
				) : keys.data && keys.data.length > 0 ? (
					<Table>
						<THead>
							<tr>
								<TH>Name</TH>
								<TH>Key</TH>
								<TH>Created</TH>
								<TH>Last used</TH>
								<TH>Status</TH>
								<TH className="text-right">Actions</TH>
							</tr>
						</THead>
						<tbody>
							{keys.data.map((k) => {
								const revoked = Boolean(k.revokedAt);
								return (
									<TR key={k.id}>
										<TD className="font-medium text-gray-800">{k.name}</TD>
										<TD>
											<code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
												{k.keyPrefix}…
											</code>
										</TD>
										<TD>{formatDate(k.createdAt)}</TD>
										<TD>{k.lastUsedAt ? formatDate(k.lastUsedAt) : "Never"}</TD>
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
													onClick={() => setToRevoke(k)}
												>
													Revoke
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
						title="No API keys yet"
						description="Create your first key to start sending requests to the gateway."
						action={
							<Button variant="primary" onClick={() => setCreateOpen(true)}>
								<Plus className="h-4 w-4" />
								Create key
							</Button>
						}
					/>
				)}
			</PageContainer>

			<Modal
				open={createOpen}
				onClose={closeCreate}
				title={created ? "Save your API key" : "Create API key"}
			>
				{created ? (
					<div>
						<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
							Copy this key now — for security you won’t be able to see it again.
						</div>
						<div className="mt-3">
							<div className="mb-1 text-sm font-medium text-gray-700">
								{created.name}
							</div>
							<div className="flex items-center gap-2">
								<code className="flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800">
									{created.plaintext}
								</code>
								<Button onClick={copyPlaintext}>
									{copied ? (
										<>
											<Check className="h-4 w-4" />
											Copied
										</>
									) : (
										<>
											<Copy className="h-4 w-4" />
											Copy
										</>
									)}
								</Button>
							</div>
						</div>
						<div className="mt-5 flex justify-end">
							<Button variant="primary" onClick={closeCreate}>
								Done
							</Button>
						</div>
					</div>
				) : (
					<form onSubmit={submitCreate}>
						<label
							htmlFor="key-name"
							className="mb-1 block text-sm font-medium text-gray-700"
						>
							Name
						</label>
						<Input
							id="key-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. production"
							autoFocus
							required
						/>
						{createKey.isError ? (
							<p className="mt-2 text-sm text-red-600">
								{createKey.error instanceof Error
									? createKey.error.message
									: "Could not create key."}
							</p>
						) : null}
						<div className="mt-5 flex justify-end gap-2">
							<Button
								variant="secondary"
								onClick={closeCreate}
								disabled={createKey.isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								variant="primary"
								disabled={createKey.isPending || !name.trim()}
							>
								{createKey.isPending ? "Creating…" : "Create key"}
							</Button>
						</div>
					</form>
				)}
			</Modal>

			<ConfirmDialog
				open={Boolean(toRevoke)}
				title="Revoke API key"
				message={`Revoke “${toRevoke?.name ?? ""}”? Requests using this key will immediately stop working. This cannot be undone.`}
				confirmLabel="Revoke key"
				loading={deleteKey.isPending}
				onConfirm={confirmRevoke}
				onClose={() => setToRevoke(null)}
			/>
		</>
	);
}
