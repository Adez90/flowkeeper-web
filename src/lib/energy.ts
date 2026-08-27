// The five-step red -> green scale FlowKeeper's predecessor apps used for
// energy/intensity ratings, reused here for the same domain concept:
// ingoing/outgoing energy on a 1-5 scale.
const ENERGY_SCALE = ["#E5202B", "#EF7B2D", "#E8C81E", "#8FB93A", "#20A751"];

/** Color for a 1-5 energy rating. */
export function energyColor(value: number): string {
	const index = Math.min(Math.max(Math.round(value) - 1, 0), ENERGY_SCALE.length - 1);
	return ENERGY_SCALE[index];
}

/** CSS gradient stops for a 1-5 range input's track. */
export const ENERGY_GRADIENT = `linear-gradient(90deg, ${ENERGY_SCALE.join(", ")})`;

/**
 * Color for an energy delta (outgoing minus ingoing, roughly -4..+4):
 * negative reads as draining (red end), positive as energizing (green
 * end). Same hues as the 1-5 scale so the two stay visually consistent.
 */
export function energyDeltaColor(delta: number | null | undefined): string {
	if (delta == null) {
		return "var(--text-muted)";
	}
	const clamped = Math.min(Math.max(delta, -4), 4);
	const position = Math.round(((clamped + 4) / 8) * (ENERGY_SCALE.length - 1));
	return ENERGY_SCALE[position];
}
