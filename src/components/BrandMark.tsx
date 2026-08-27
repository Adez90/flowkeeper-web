interface BrandMarkProps {
	size?: number;
}

/**
 * The folded-flag mark, in FlowKeeper's own colors — inspired by the
 * magenta/blue two-tone fold used across the old FlowKeeper/up2u product
 * family's logos, not a redraw of any of them.
 */
export function BrandMark({ size = 28 }: BrandMarkProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
			<rect width="32" height="32" rx="8" fill="var(--ink)" />
			<path d="M6 8h20v20L6 8Z" fill="var(--accent-magenta)" />
			<path d="M26 8v20H6L26 8Z" fill="var(--accent-blue)" />
		</svg>
	);
}
