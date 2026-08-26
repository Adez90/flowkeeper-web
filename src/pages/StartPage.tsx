import { Navigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

export function StartPage() {
	const auth = useAuth();

	if (auth.isAuthenticated) {
		return <Navigate to="/app" replace />;
	}

	return (
		<div className="start-page">
			<div className="start-page__card">
				<h1>FlowKeeper</h1>
				<p>Log what you do, how you felt going in, and how it actually went — then see your day, week, or month.</p>
				<button
					type="button"
					className="button button--primary"
					onClick={() => auth.signinRedirect()}
					disabled={auth.isLoading}
				>
					Log in or create an account
				</button>
				{/* Keycloak's own login page offers "Register" from here — a
				    direct deep link to the registration form is possible via
				    Keycloak's /registrations endpoint, but wasn't wired up
				    without a running realm to verify it against. */}
				{auth.error && <p className="error-text">{auth.error.message}</p>}
			</div>
		</div>
	);
}
