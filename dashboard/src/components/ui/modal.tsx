"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				className="absolute inset-0 bg-gray-900/20"
				onClick={onClose}
				aria-hidden="true"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={title}
				className="relative z-10 w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-lg"
			>
				<div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
					<h2 className="text-sm font-semibold text-gray-800">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
						aria-label="Close"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
				<div className="px-5 py-4">{children}</div>
			</div>
		</div>
	);
}

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
		<Modal open={open} onClose={onClose} title={title}>
			<p className="text-sm text-gray-600">{message}</p>
			<div className="mt-5 flex justify-end gap-2">
				<Button variant="secondary" onClick={onClose} disabled={loading}>
					Cancel
				</Button>
				<Button variant="danger" onClick={onConfirm} disabled={loading}>
					{loading ? "Working…" : confirmLabel}
				</Button>
			</div>
		</Modal>
	);
}
