import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { ActiveAccountProvider } from "../context/ActiveAccountContext";
import type { AccountSummary, MeResponse } from "../api/types";

// NotificationBell needs its own auth/query-client context — irrelevant to
// what AppHeader itself is responsible for, so it's stubbed out here.
vi.mock("./NotificationBell", () => ({ NotificationBell: () => null }));

function baseMe(overrides: Partial<MeResponse> = {}): MeResponse {
	return {
		userId: "u1",
		displayName: "Anders Johansson",
		email: "anders@example.com",
		timezone: "UTC",
		locale: null,
		avatarUrl: null,
		notifyInApp: false,
		notifyPush: false,
		notifyEmail: false,
		accounts: [],
		isPlatformAdmin: false,
		...overrides,
	};
}

const PERSONAL: AccountSummary = { accountId: "personal-1", name: "Anders Johansson", type: "PERSONAL", role: "OWNER" };
const ORG: AccountSummary = { accountId: "org-1", name: "Acme AB", type: "ORGANISATION", role: "OWNER" };

describe("AppHeader", () => {
	it("shows the first letter of the display name when there's no avatar", () => {
		render(
			<MemoryRouter>
				<AppHeader me={baseMe({ displayName: "Anders Johansson" })} />
			</MemoryRouter>,
		);

		expect(screen.getByText("A")).toBeInTheDocument();
	});

	it("renders the avatar image when one is set, instead of the fallback initial", () => {
		const { container } = render(
			<MemoryRouter>
				<AppHeader me={baseMe({ avatarUrl: "https://example.com/me.png" })} />
			</MemoryRouter>,
		);

		// alt="" is deliberate (decorative — the link's aria-label already
		// names it), which removes it from the accessibility tree, so this
		// has to query the DOM directly rather than by role.
		const avatar = container.querySelector("img.app-header__avatar");
		expect(avatar).toHaveAttribute("src", "https://example.com/me.png");
		expect(screen.queryByText("A")).not.toBeInTheDocument();
	});

	it("shows a '?' fallback before the profile has loaded at all", () => {
		render(
			<MemoryRouter>
				<AppHeader />
			</MemoryRouter>,
		);

		expect(screen.getByText("?")).toBeInTheDocument();
	});

	it("links the account icon to the profile page", () => {
		render(
			<MemoryRouter>
				<AppHeader me={baseMe()} />
			</MemoryRouter>,
		);

		expect(screen.getByLabelText("Your information")).toHaveAttribute("href", "/app/profile");
	});

	it("doesn't show an account switcher with only one account", () => {
		render(
			<MemoryRouter>
				<AppHeader me={baseMe({ accounts: [PERSONAL] })} />
			</MemoryRouter>,
		);

		expect(screen.queryByLabelText("Active account")).not.toBeInTheDocument();
	});

	it("shows an account switcher once there's more than one account", () => {
		const me = baseMe({ accounts: [PERSONAL, ORG] });
		render(
			<MemoryRouter>
				<ActiveAccountProvider me={me}>
					<AppHeader me={me} />
				</ActiveAccountProvider>
			</MemoryRouter>,
		);

		expect(screen.getByLabelText("Active account")).toBeInTheDocument();
	});

	it("only shows the Feedback link for an organisation owner", () => {
		render(
			<MemoryRouter>
				<AppHeader me={baseMe()} activeAccountType="ORGANISATION" activeAccountRole="OWNER" />
			</MemoryRouter>,
		);

		expect(screen.getByRole("link", { name: "Feedback" })).toBeInTheDocument();
	});

	it("hides the Feedback link for a plain organisation member", () => {
		render(
			<MemoryRouter>
				<AppHeader me={baseMe()} activeAccountType="ORGANISATION" activeAccountRole="MEMBER" />
			</MemoryRouter>,
		);

		expect(screen.queryByRole("link", { name: "Feedback" })).not.toBeInTheDocument();
	});
});
