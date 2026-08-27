import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { AppLayout } from "./layouts/AppLayout";
import { StartPage } from "./pages/StartPage";
import { LandingPage } from "./pages/LandingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { OrganisationPage } from "./pages/OrganisationPage";
import { FeedbackPage } from "./pages/FeedbackPage";

export const router = createBrowserRouter([
	{ path: "/", element: <StartPage /> },
	{
		element: <RequireAuth />,
		children: [
			{
				element: <AppLayout />,
				children: [
					{ path: "/app", element: <LandingPage /> },
					{ path: "/app/profile", element: <ProfilePage /> },
					{ path: "/app/statistics", element: <StatisticsPage /> },
					{ path: "/app/organisation", element: <OrganisationPage /> },
					{ path: "/app/feedback", element: <FeedbackPage /> },
				],
			},
		],
	},
]);
