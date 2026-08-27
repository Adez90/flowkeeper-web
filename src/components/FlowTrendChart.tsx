import type { TrendPoint } from "../api/types";

const WIDTH = 480;
const HEIGHT = 140;
const PADDING = 8;

/** A minimal day-by-day Flow % line chart — no charting library, just an SVG polyline over 0-100%. */
export function FlowTrendChart({ points }: { points: TrendPoint[] }) {
	if (points.length === 0) {
		return <p className="empty-state">No days in this range.</p>;
	}

	const plotWidth = WIDTH - PADDING * 2;
	const plotHeight = HEIGHT - PADDING * 2;
	const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;
	const coords = points.map((point, index) => {
		const x = PADDING + index * stepX;
		const y = PADDING + plotHeight * (1 - point.flowPercentage / 100);
		return { x, y, point };
	});
	const linePath = coords.map((c) => `${c.x},${c.y}`).join(" ");

	const totalEvents = points.reduce((sum, p) => sum + p.totalEvents, 0);

	return (
		<div className="flow-trend-chart">
			{totalEvents === 0 ? (
				<p className="empty-state">No activity logged in this range yet.</p>
			) : (
				<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="flow-trend-chart__svg" role="img" aria-label="Flow percentage trend">
					<line x1={PADDING} y1={PADDING} x2={WIDTH - PADDING} y2={PADDING} className="flow-trend-chart__gridline" />
					<line
						x1={PADDING}
						y1={HEIGHT - PADDING}
						x2={WIDTH - PADDING}
						y2={HEIGHT - PADDING}
						className="flow-trend-chart__gridline"
					/>
					<polyline points={linePath} className="flow-trend-chart__line" fill="none" />
					{coords.map((c) => (
						<circle
							key={c.point.date}
							cx={c.x}
							cy={c.y}
							r={c.point.totalEvents > 0 ? 3 : 1.5}
							className="flow-trend-chart__dot"
						>
							<title>
								{c.point.date}: {c.point.flowPercentage.toFixed(0)}% in flow ({c.point.completedEvents} completed)
							</title>
						</circle>
					))}
				</svg>
			)}
			<div className="flow-trend-chart__axis">
				<span>{points[0].date}</span>
				<span>{points[points.length - 1].date}</span>
			</div>
		</div>
	);
}
