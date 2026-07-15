"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { PageContainer, PageHeader } from "@/components/page-header";
import { ProviderLogo } from "@/components/provider-logo";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ToneChip } from "@/components/tone-chip";
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
					<Button
						variant="contained"
						startIcon={<AddIcon />}
						onClick={() => setAddOpen(true)}
					>
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
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Provider</TableCell>
									<TableCell>Secret</TableCell>
									<TableCell>Added</TableCell>
									<TableCell>Status</TableCell>
									<TableCell align="right">Actions</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{credentials.data.map((c) => {
									const revoked = Boolean(c.revokedAt);
									return (
										<TableRow key={c.id} hover>
											<TableCell sx={{ fontWeight: 500 }}>
												<Box
													sx={{
														display: "inline-flex",
														alignItems: "center",
														gap: 1,
													}}
												>
													<ProviderLogo provider={c.provider} size={20} />
													{providerLabel(c.provider)}
												</Box>
											</TableCell>
											<TableCell>
												<Box
													component="code"
													sx={{
														fontFamily:
															"ui-monospace, SFMono-Regular, Menlo, monospace",
														fontSize: "0.78rem",
														color: "text.disabled",
														letterSpacing: 1,
													}}
												>
													••••••••••••••••
												</Box>
											</TableCell>
											<TableCell>{formatDate(c.createdAt)}</TableCell>
											<TableCell>
												{revoked ? (
													<ToneChip label="Revoked" tone="danger" />
												) : (
													<ToneChip label="Active" tone="success" />
												)}
											</TableCell>
											<TableCell align="right">
												{revoked ? (
													<Typography
														variant="caption"
														sx={{ color: "text.disabled" }}
													>
														—
													</Typography>
												) : (
													<Button
														variant="outlined"
														size="small"
														color="error"
														onClick={() => setToDelete(c)}
													>
														Delete
													</Button>
												)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
				) : (
					<EmptyState
						title="No provider keys yet"
						description="Add an upstream provider secret so the gateway can route requests."
						action={
							<Button
								variant="contained"
								startIcon={<AddIcon />}
								onClick={() => setAddOpen(true)}
							>
								Add provider key
							</Button>
						}
					/>
				)}
			</PageContainer>

			<Dialog open={addOpen} onClose={closeAdd} fullWidth maxWidth="sm">
				<DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>
					Add provider key
				</DialogTitle>
				<Box component="form" onSubmit={submitAdd}>
					<DialogContent>
						<Stack spacing={2}>
							<TextField
								select
								id="provider"
								label="Provider"
								size="small"
								fullWidth
								value={provider}
								onChange={(e) => setProvider(e.target.value)}
							>
								{PROVIDERS.map((p) => (
									<MenuItem key={p.value} value={p.value}>
										<Box
											sx={{
												display: "inline-flex",
												alignItems: "center",
												gap: 1,
											}}
										>
											<ProviderLogo provider={p.value} size={18} />
											{p.label}
										</Box>
									</MenuItem>
								))}
							</TextField>
							<TextField
								id="secret"
								label="API key"
								type="password"
								size="small"
								fullWidth
								required
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
								placeholder="sk-…"
								autoComplete="off"
								helperText="Stored securely and never displayed again."
							/>
							{createCredential.isError ? (
								<Alert severity="error" sx={{ py: 0 }}>
									{createCredential.error instanceof Error
										? createCredential.error.message
										: "Could not save provider key."}
								</Alert>
							) : null}
						</Stack>
					</DialogContent>
					<DialogActions sx={{ px: 3, pb: 2.5 }}>
						<Button
							variant="outlined"
							onClick={closeAdd}
							disabled={createCredential.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="contained"
							disabled={createCredential.isPending || !apiKey.trim()}
						>
							{createCredential.isPending ? "Saving…" : "Save key"}
						</Button>
					</DialogActions>
				</Box>
			</Dialog>

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
