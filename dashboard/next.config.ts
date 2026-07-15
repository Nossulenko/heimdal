import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: true,
	// Pin the workspace root so Next doesn't pick up an unrelated parent lockfile.
	turbopack: {
		root: path.resolve(process.cwd()),
	},
};

export default nextConfig;
