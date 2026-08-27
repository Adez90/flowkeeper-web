import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";

export function RequireAuth() {
	const auth = useAuth();
	const { t } = useTranslation();

	if (auth.isLoading) {
		return <p className="page-loading">{t("landing.loading")}</p>;
	}
	if (!auth.isAuthenticated) {
		return <Navigate to="/" replace />;
	}
	return <Outlet />;
}
