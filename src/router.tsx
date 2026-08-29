import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { AppLayout } from "./layouts/AppLayout";
import { StartPage } from "./pages/StartPage";
import { LandingPage } from "./pages/LandingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { OrganisationPage } from "./pages/OrganisationPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { CompletedPage } from "./pages/CompletedPage";
import { BillingPage } from "./pages/BillingPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { AdminPromoCodesPage } from "./pages/AdminPromoCodesPage";

export const router = createBrowserRouter([
	{ path: "/", element: <StartPage /> },
	{
		element: <RequireAuth />,
		children: [
			{
				element: <AppLayout />,
				children: [
					{ path: "/app", element: <LandingPage /> },
					{ path: "/app/completed", element: <CompletedPage /> },
					{ path: "/app/profile", element: <ProfilePage /> },
					{ path: "/app/statistics", element: <StatisticsPage /> },
					{ path: "/app/organisation", element: <OrganisationPage /> },
					{ path: "/app/feedback", element: <FeedbackPage /> },
					{ path: "/app/billing", element: <BillingPage /> },
					{ path: "/app/integrations", element: <IntegrationsPage /> },
					// Not linked from nav — platform-admin only, gated server-side (see PlatformAdmins).
					{ path: "/app/admin/promo-codes", element: <AdminPromoCodesPage /> },
				],
			},
		],
	},
]);
