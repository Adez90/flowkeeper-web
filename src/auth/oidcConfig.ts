import type { AuthProviderProps } from "react-oidc-context";

export const oidcConfig: AuthProviderProps = {
	authority: import.meta.env.VITE_KEYCLOAK_AUTHORITY ?? "http://localhost:8082/realms/flowkeeper",
	client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "flowkeeper-web",
	redirect_uri: window.location.origin,
	scope: "openid profile email",
	onSigninCallback: () => {
		// Strip the ?code=&state=... Keycloak appended, so a refresh
		// doesn't try to replay the same authorization code.
		window.history.replaceState({}, document.title, window.location.pathname);
	},
};
