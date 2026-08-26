import { Link } from "react-router-dom";
import type { MeResponse } from "../api/types";

interface AppHeaderProps {
	me?: MeResponse;
}

export function AppHeader({ me }: AppHeaderProps) {
	const initial = me?.displayName.trim().charAt(0).toUpperCase() || "?";

	return (
		<header className="app-header">
			<Link to="/app" className="app-header__brand">
				FlowKeeper
			</Link>

			<nav className="app-header__nav">
				<Link to="/app">Ongoing</Link>
				<Link to="/app/statistics">Statistics</Link>
			</nav>

			<Link to="/app/profile" className="app-header__account" aria-label="Your information">
				<svg className="app-header__gear" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
					<path
						fill="currentColor"
						d="M10 12.9a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8Zm7.45-2.9c0-.42-.04-.83-.11-1.22l1.62-1.27a.5.5 0 0 0 .11-.63l-1.5-2.6a.5.5 0 0 0-.6-.22l-1.92.77a6.7 6.7 0 0 0-1.06-.62l-.29-2.04a.5.5 0 0 0-.5-.43H9.8a.5.5 0 0 0-.5.43l-.29 2.04c-.38.16-.74.36-1.06.62l-1.92-.77a.5.5 0 0 0-.6.22l-1.5 2.6a.5.5 0 0 0 .11.63l1.62 1.27c-.07.4-.11.8-.11 1.22 0 .42.04.83.11 1.22L4.04 12.4a.5.5 0 0 0-.11.63l1.5 2.6c.13.22.4.31.6.22l1.92-.77c.32.26.68.46 1.06.62l.29 2.04c.04.25.26.43.5.43h3.2a.5.5 0 0 0 .5-.43l.29-2.04c.38-.16.74-.36 1.06-.62l1.92.77c.2.09.47 0 .6-.22l1.5-2.6a.5.5 0 0 0-.11-.63l-1.62-1.27c.07-.4.11-.8.11-1.22Z"
					/>
				</svg>
				{me?.avatarUrl ? (
					<img className="app-header__avatar" src={me.avatarUrl} alt="" />
				) : (
					<span className="app-header__avatar app-header__avatar--fallback">{initial}</span>
				)}
			</Link>
		</header>
	);
}
