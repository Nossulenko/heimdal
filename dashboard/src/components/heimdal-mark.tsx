/**
 * HeimdalMark is the Heimdal logo: three outlined triangles arranged in a
 * triangle. It draws with `currentColor`, so it inherits the surrounding text
 * color (e.g. white inside the dark badge, dark on light backgrounds).
 */
export function HeimdalMark({
	size = 20,
	strokeWidth = 7,
}: {
	size?: number;
	strokeWidth?: number;
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			fill="none"
			stroke="currentColor"
			strokeWidth={strokeWidth}
			strokeLinejoin="round"
			aria-hidden="true"
			style={{ display: "block" }}
		>
			<polygon points="50,15 31,47 69,47" />
			<polygon points="30,53 11,85 49,85" />
			<polygon points="70,53 51,85 89,85" />
		</svg>
	);
}
