import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import { RequireAuth } from "./RequireAuth";

vi.mock("react-oidc-context", () => ({
	useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderGuarded() {
	return render(
		<MemoryRouter initialEntries={["/app"]}>
			<Routes>
				<Route path="/" element={<div>Start page</div>} />
				<Route element={<RequireAuth />}>
					<Route path="/app" element={<div>Protected content</div>} />
				</Route>
			</Routes>
		</MemoryRouter>,
	);
}

describe("RequireAuth", () => {
	it("shows a loading state while auth is still resolving", () => {
		mockedUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false } as AuthContextProps);

		renderGuarded();

		expect(screen.getByText("Loading…")).toBeInTheDocument();
	});

	it("redirects to the start page when not authenticated", () => {
		mockedUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false } as AuthContextProps);

		renderGuarded();

		expect(screen.getByText("Start page")).toBeInTheDocument();
		expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
	});

	it("renders the protected route once authenticated", () => {
		mockedUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true } as AuthContextProps);

		renderGuarded();

		expect(screen.getByText("Protected content")).toBeInTheDocument();
	});
});
