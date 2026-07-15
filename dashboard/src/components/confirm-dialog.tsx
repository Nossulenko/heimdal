"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	loading?: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = "Confirm",
	loading = false,
	onConfirm,
	onClose,
}: ConfirmDialogProps) {
	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth="xs"
			aria-labelledby="confirm-dialog-title"
		>
			<DialogTitle id="confirm-dialog-title" sx={{ fontSize: "1rem", fontWeight: 600 }}>
				{title}
			</DialogTitle>
			<DialogContent>
				<DialogContentText sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
					{message}
				</DialogContentText>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2.5 }}>
				<Button variant="outlined" onClick={onClose} disabled={loading}>
					Cancel
				</Button>
				<Button
					variant="contained"
					color="error"
					onClick={onConfirm}
					disabled={loading}
				>
					{loading ? "Working…" : confirmLabel}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
