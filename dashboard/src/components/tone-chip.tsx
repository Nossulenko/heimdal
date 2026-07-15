import Chip from "@mui/material/Chip";
import { tone as tonePalette } from "@/theme";

type Tone = keyof typeof tonePalette;

export function ToneChip({ label, tone }: { label: string; tone: Tone }) {
	const c = tonePalette[tone];
	return (
		<Chip
			label={label}
			size="small"
			sx={{
				color: c.color,
				bgcolor: c.bg,
				border: "none",
				"& .MuiChip-label": { px: 1 },
			}}
		/>
	);
}
