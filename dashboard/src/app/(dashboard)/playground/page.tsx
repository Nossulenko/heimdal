"use client";

import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SendIcon from "@mui/icons-material/Send";
import { PageContainer, PageHeader } from "@/components/page-header";
import { type ChatMessage, streamPlayground } from "@/lib/api";
import { useModels } from "@/lib/hooks";

export default function PlaygroundPage() {
	const models = useModels();
	const logicalNames = useMemo(() => {
		const set = new Set<string>();
		for (const m of models.data ?? []) set.add(m.logicalName);
		return [...set].sort();
	}, [models.data]);

	const [model, setModel] = useState("");
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const activeModel = model || logicalNames[0] || "";

	function appendToLast(delta: string) {
		setMessages((prev) => {
			const copy = [...prev];
			const last = copy[copy.length - 1];
			copy[copy.length - 1] = { ...last, content: last.content + delta };
			return copy;
		});
	}

	async function send() {
		const text = input.trim();
		if (!text || streaming || !activeModel) return;

		const history: ChatMessage[] = [...messages, { role: "user", content: text }];
		setMessages([...history, { role: "assistant", content: "" }]);
		setInput("");
		setError(null);
		setStreaming(true);

		const controller = new AbortController();
		abortRef.current = controller;
		try {
			await streamPlayground(activeModel, history, appendToLast, controller.signal);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Request failed.");
			// Drop the empty assistant placeholder on failure.
			setMessages((prev) => {
				const last = prev[prev.length - 1];
				return last && last.role === "assistant" && last.content === ""
					? prev.slice(0, -1)
					: prev;
			});
		} finally {
			setStreaming(false);
			abortRef.current = null;
		}
	}

	function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void send();
		}
	}

	function reset() {
		abortRef.current?.abort();
		setMessages([]);
		setError(null);
	}

	return (
		<>
			<PageHeader
				title="Playground"
				description="Chat through the gateway with any routed model. Requests are metered against your balance."
				actions={
					messages.length > 0 ? (
						<Button variant="outlined" size="small" onClick={reset}>
							Clear
						</Button>
					) : undefined
				}
			/>
			<PageContainer>
				<Stack spacing={2}>
					<TextField
						select
						size="small"
						label="Model"
						value={activeModel}
						onChange={(e) => setModel(e.target.value)}
						sx={{ maxWidth: 320 }}
						disabled={logicalNames.length === 0}
					>
						{logicalNames.map((name) => (
							<MenuItem key={name} value={name}>
								{name}
							</MenuItem>
						))}
					</TextField>

					<Box
						sx={{
							border: "1px solid",
							borderColor: "divider",
							borderRadius: 2,
							p: 2,
							minHeight: 320,
							display: "flex",
							flexDirection: "column",
							gap: 1.5,
						}}
					>
						{messages.length === 0 ? (
							<Box
								sx={{
									flex: 1,
									display: "grid",
									placeItems: "center",
									color: "text.disabled",
									fontSize: "0.9rem",
								}}
							>
								Send a message to start.
							</Box>
						) : (
							messages.map((m, i) => (
								<Box
									key={i}
									sx={{
										alignSelf: m.role === "user" ? "flex-end" : "flex-start",
										maxWidth: "80%",
										px: 1.75,
										py: 1.25,
										borderRadius: 2,
										whiteSpace: "pre-wrap",
										fontSize: "0.9rem",
										bgcolor: m.role === "user" ? "primary.main" : "action.hover",
										color: m.role === "user" ? "primary.contrastText" : "text.primary",
									}}
								>
									{m.content || (streaming ? "…" : "")}
								</Box>
							))
						)}
					</Box>

					{error ? <Alert severity="error">{error}</Alert> : null}

					<Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
						<TextField
							fullWidth
							multiline
							maxRows={6}
							size="small"
							placeholder="Message… (Enter to send, Shift+Enter for newline)"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={onKeyDown}
							disabled={streaming}
						/>
						<Button
							variant="contained"
							onClick={() => void send()}
							disabled={streaming || !input.trim() || !activeModel}
							startIcon={
								streaming ? (
									<CircularProgress size={16} color="inherit" />
								) : (
									<SendIcon fontSize="small" />
								)
							}
							sx={{ height: 40, flexShrink: 0 }}
						>
							Send
						</Button>
					</Stack>

					<Typography variant="caption" sx={{ color: "text.disabled" }}>
						Routed as <code>{activeModel || "—"}</code> through
						<code> POST /v1/chat/completions</code>.
					</Typography>
				</Stack>
			</PageContainer>
		</>
	);
}
