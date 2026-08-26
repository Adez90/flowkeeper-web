import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import type { MeResponse } from "../api/types";

function baseMe(overrides: Partial<MeResponse> = {}): MeResponse {
	return {
		userId: "u1",
		displayName: "Anders Johansson",
		email: "anders@example.com",
		timezone: "UTC",
		locale: null,
		avatarUrl: null,
		accounts: [],
		...overrides,
	};
}

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
});
