import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "react-oidc-context";

export function RequireAuth() {
	const auth = useAuth();

	if (auth.isLoading) {
		return <p className="page-loading">Loading…</p>;
	}
	if (!auth.isAuthenticated) {
		return <Navigate to="/" replace />;
	}
	return <Outlet />;
}
