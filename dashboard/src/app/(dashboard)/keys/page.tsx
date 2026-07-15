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
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { PageContainer, PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ToneChip } from "@/components/tone-chip";
import type { ApiKey, CreatedApiKey } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useCreateKey, useDeleteKey, useKeys } from "@/lib/hooks";

const codeSx = {
	fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
	fontSize: "0.78rem",
} as const;

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
					<Button
						variant="contained"
						startIcon={<AddIcon />}
						onClick={() => setCreateOpen(true)}
					>
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
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Name</TableCell>
									<TableCell>Key</TableCell>
									<TableCell>Created</TableCell>
									<TableCell>Last used</TableCell>
									<TableCell>Status</TableCell>
									<TableCell align="right">Actions</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{keys.data.map((k) => {
									const revoked = Boolean(k.revokedAt);
									return (
										<TableRow key={k.id} hover>
											<TableCell sx={{ fontWeight: 500 }}>{k.name}</TableCell>
											<TableCell>
												<Box
													component="code"
													sx={{
														...codeSx,
														bgcolor: "action.hover",
														px: 0.75,
														py: 0.25,
														borderRadius: 1,
														color: "text.secondary",
													}}
												>
													{k.keyPrefix}…
												</Box>
											</TableCell>
											<TableCell>{formatDate(k.createdAt)}</TableCell>
											<TableCell>
												{k.lastUsedAt ? formatDate(k.lastUsedAt) : "Never"}
											</TableCell>
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
														onClick={() => setToRevoke(k)}
													>
														Revoke
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
						title="No API keys yet"
						description="Create your first key to start sending requests to the gateway."
						action={
							<Button
								variant="contained"
								startIcon={<AddIcon />}
								onClick={() => setCreateOpen(true)}
							>
								Create key
							</Button>
						}
					/>
				)}
			</PageContainer>

			<Dialog open={createOpen} onClose={closeCreate} fullWidth maxWidth="sm">
				<DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>
					{created ? "Save your API key" : "Create API key"}
				</DialogTitle>
				{created ? (
					<>
						<DialogContent>
							<Alert severity="warning" sx={{ mb: 2 }}>
								Copy this key now — for security you won’t be able to see it again.
							</Alert>
							<Typography
								variant="subtitle2"
								sx={{ mb: 1, color: "text.primary" }}
							>
								{created.name}
							</Typography>
							<TextField
								fullWidth
								size="small"
								value={created.plaintext}
								slotProps={{
									input: {
										readOnly: true,
										sx: codeSx,
										endAdornment: (
											<InputAdornment position="end">
												<Tooltip title={copied ? "Copied" : "Copy"}>
													<Button
														size="small"
														onClick={copyPlaintext}
														startIcon={
															copied ? <CheckIcon /> : <ContentCopyIcon />
														}
													>
														{copied ? "Copied" : "Copy"}
													</Button>
												</Tooltip>
											</InputAdornment>
										),
									},
								}}
							/>
						</DialogContent>
						<DialogActions sx={{ px: 3, pb: 2.5 }}>
							<Button variant="contained" onClick={closeCreate}>
								Done
							</Button>
						</DialogActions>
					</>
				) : (
					<Box component="form" onSubmit={submitCreate}>
						<DialogContent>
							<Stack spacing={1.5}>
								<TextField
									id="key-name"
									label="Name"
									size="small"
									fullWidth
									autoFocus
									required
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g. production"
								/>
								{createKey.isError ? (
									<Alert severity="error" sx={{ py: 0 }}>
										{createKey.error instanceof Error
											? createKey.error.message
											: "Could not create key."}
									</Alert>
								) : null}
							</Stack>
						</DialogContent>
						<DialogActions sx={{ px: 3, pb: 2.5 }}>
							<Button
								variant="outlined"
								onClick={closeCreate}
								disabled={createKey.isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								variant="contained"
								disabled={createKey.isPending || !name.trim()}
							>
								{createKey.isPending ? "Creating…" : "Create key"}
							</Button>
						</DialogActions>
					</Box>
				)}
			</Dialog>

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
