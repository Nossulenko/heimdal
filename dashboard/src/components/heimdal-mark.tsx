import Box from "@mui/material/Box";

/**
 * HeimdalMark renders the Heimdal logo (three triangles) as a bare mark — no
 * background badge. Black on light surfaces; the source PNG lives in /public.
 */
export function HeimdalMark({ size = 30 }: { size?: number }) {
	return (
		<Box
			component="img"
			src="/logo-black.png"
			alt="Heimdal"
			sx={{ width: size, height: size, display: "block" }}
		/>
	);
}
