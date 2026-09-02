import { flowPercentageColor } from "../lib/energy";

const RADIUS = 40;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = Math.PI * RADIUS; // half-circle arc length

/** A single person's Flow % as a half-circle gauge, with their name below — the team view's per-member counterpart to the anonymous aggregate tiles. */
export function FlowGauge({ displayName, flowPercentage }: { displayName: string; flowPercentage: number }) {
	const clamped = Math.min(Math.max(flowPercentage, 0), 100);
	const filled = (clamped / 100) * CIRCUMFERENCE;
	const color = flowPercentageColor(clamped);

	return (
		<div className="flow-gauge">
			<svg viewBox="0 0 100 56" className="flow-gauge__svg" role="img" aria-label={`${displayName}: ${clamped.toFixed(0)}% in flow`}>
				<path
					d="M 10 50 A 40 40 0 0 1 90 50"
					fill="none"
					className="flow-gauge__track"
					strokeWidth={STROKE_WIDTH}
					strokeLinecap="round"
				/>
				<path
					d="M 10 50 A 40 40 0 0 1 90 50"
					fill="none"
					stroke={color}
					strokeWidth={STROKE_WIDTH}
					strokeLinecap="round"
					strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
				/>
				<text x="50" y="42" textAnchor="middle" className="flow-gauge__value">
					{clamped.toFixed(0)}%
				</text>
			</svg>
			<span className="flow-gauge__name">{displayName}</span>
		</div>
	);
}
