import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import * as reactRouterDom from "react-router-dom";
import { renderWithProviders } from "../test/testUtils";
import { OrganisationPage } from "./OrganisationPage";
import * as organisationsApi from "../api/organisations";
import { useActiveAccount } from "../context/ActiveAccountContext";
import type { AccountSummary, MeResponse, MemberResponse, OrganisationStructureResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/organisations");
vi.mock("../context/ActiveAccountContext", () => ({ useActiveAccount: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => {
	const actual = await importOriginal<typeof reactRouterDom>();
	return { ...actual, useOutletContext: vi.fn() };
});

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseOutletContext = vi.mocked(reactRouterDom.useOutletContext);
const mockedUseActiveAccount = vi.mocked(useActiveAccount);
const mockedOrganisationsApi = vi.mocked(organisationsApi);

const PERSONAL: AccountSummary = { accountId: "personal-1", name: "Anders Johansson", type: "PERSONAL", role: "OWNER" };
const ORG: AccountSummary = { accountId: "org-1", name: "Acme AB", type: "ORGANISATION", role: "OWNER" };

const ME: MeResponse = {
	userId: "u1",
	displayName: "Anders Johansson",
	email: "anders@example.com",
	timezone: "UTC",
	locale: null,
	avatarUrl: null,
	accounts: [PERSONAL],
};

function setActiveAccount(account: AccountSummary) {
	mockedUseActiveAccount.mockReturnValue({
		account,
		accountId: account.accountId,
		accounts: [account],
		setAccountId: vi.fn(),
	});
}

describe("OrganisationPage", () => {
	beforeEach(() => {
		mockedUseAuth.mockReturnValue({ user: { access_token: "test-token" } } as AuthContextProps);
		mockedUseOutletContext.mockReturnValue(ME);
	});

	it("offers to create an organisation when the active account is Personal", async () => {
		setActiveAccount(PERSONAL);

		renderWithProviders(<OrganisationPage />);

		expect(screen.getByText(/you're not part of an organisation yet/)).toBeInTheDocument();
		expect(screen.getByLabelText("Organisation name")).toBeInTheDocument();
	});

	it("switches to the new organisation after creating one", async () => {
		setActiveAccount(PERSONAL);
		mockedOrganisationsApi.createOrganisation.mockResolvedValue({ accountId: "org-2", name: "New Co", role: "OWNER" });
		const user = userEvent.setup();

		renderWithProviders(<OrganisationPage />);

		await user.type(screen.getByLabelText("Organisation name"), "New Co");
		await user.click(screen.getByRole("button", { name: "Create organisation" }));

		await waitFor(() => expect(mockedOrganisationsApi.createOrganisation).toHaveBeenCalledWith("test-token", { name: "New Co" }));
		const activeAccount = mockedUseActiveAccount.mock.results[0].value;
		await waitFor(() => expect(activeAccount.setAccountId).toHaveBeenCalledWith("org-2"));
	});

	describe("with an Organisation account", () => {
		const structure: OrganisationStructureResponse = {
			departments: [{ id: "dept-1", name: "Engineering", shareFlowWithPeers: false }],
			groups: [{ id: "group-1", name: "Backend", departmentId: "dept-1", shareFlowWithPeers: true }],
		};
		const members: MemberResponse[] = [
			{
				userId: "u1",
				displayName: "Anders Johansson",
				email: "anders@example.com",
				role: "OWNER",
				departmentId: null,
				groupId: null,
				shareFlowWithPeers: false,
			},
		];

		beforeEach(() => {
			setActiveAccount(ORG);
			mockedOrganisationsApi.fetchStructure.mockResolvedValue(structure);
			mockedOrganisationsApi.fetchMembers.mockResolvedValue(members);
		});

		it("renders the department/group structure and the member list", async () => {
			renderWithProviders(<OrganisationPage />);

			// "Engineering" also appears as a <select> option in the group
			// quick-add form below — this targets only the department list row.
			await screen.findByText("Engineering", { selector: "li.org-structure-list__item > span" });
			expect(screen.getByText("Backend")).toBeInTheDocument();
			expect(screen.getByText("Anders Johansson", { exact: false })).toBeInTheDocument();
		});

		it("shows the add-member action to an OWNER", async () => {
			renderWithProviders(<OrganisationPage />);

			await screen.findByRole("button", { name: "+ Add member" });
		});

		it("hides manager-only actions from a plain member", async () => {
			setActiveAccount({ ...ORG, role: "MEMBER" });

			renderWithProviders(<OrganisationPage />);

			await screen.findByText("Engineering");
			expect(screen.queryByRole("button", { name: "+ Add member" })).not.toBeInTheDocument();
			expect(screen.queryByPlaceholderText("New department name")).not.toBeInTheDocument();
		});

		it("lets the current user toggle sharing their own Flow % with peers", async () => {
			mockedOrganisationsApi.updateMemberSharing.mockResolvedValue({ ...members[0], shareFlowWithPeers: true });
			const user = userEvent.setup();

			renderWithProviders(<OrganisationPage />);

			await screen.findByText("Share my Flow % with my group");
			await user.click(screen.getByLabelText("Share my Flow % with my group"));

			await waitFor(() =>
				expect(mockedOrganisationsApi.updateMemberSharing).toHaveBeenCalledWith("test-token", "org-1", {
					shareFlowWithPeers: true,
				}),
			);
		});
	});
});
