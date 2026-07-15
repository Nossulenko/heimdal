import Box from "@mui/material/Box";

/**
 * HeimdalMark renders the Heimdal logo (three triangles). It uses the white
 * variant because the mark always sits inside the dark badge; the source PNG
 * lives in /public.
 */
export function HeimdalMark({ size = 20 }: { size?: number }) {
	return (
		<Box
			component="img"
			src="/logo-white.png"
			alt="Heimdal"
			sx={{ width: size, height: size, display: "block" }}
		/>
	);
}
