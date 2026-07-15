"use client";

import { HeimdalMark } from "@/components/heimdal-mark";

/**
 * LogoMark is the bare Heimdal mark used in the landing nav and footer (both on
 * light backgrounds).
 */
export function LogoMark({ size = 30 }: { size?: number; fontSize?: number; radius?: number }) {
	return <HeimdalMark size={size} />;
}
