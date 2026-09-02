import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "react-oidc-context";
import type { AuthContextProps } from "react-oidc-context";
import * as reactRouterDom from "react-router-dom";
import { renderWithProviders } from "../test/testUtils";
import { OrganisationPage } from "./OrganisationPage";
import * as organisationsApi from "../api/organisations";
import { useActiveAccount } from "../context/useActiveAccount";
import type { AccountSummary, MeResponse, MemberResponse, OrganisationStructureResponse } from "../api/types";

vi.mock("react-oidc-context", () => ({ useAuth: vi.fn() }));
vi.mock("../api/organisations");
vi.mock("../context/useActiveAccount", () => ({ useActiveAccount: vi.fn() }));
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
	notifyInApp: false,
	notifyPush: false,
	notifyEmail: false,
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

		it("shows the Feedback button to an OWNER for every member", async () => {
			const peer: MemberResponse = {
				userId: "u2",
				displayName: "Someone Else",
				email: "someone@example.com",
				role: "MEMBER",
				departmentId: null,
				groupId: null,
				shareFlowWithPeers: false,
			};
			mockedOrganisationsApi.fetchMembers.mockResolvedValue([...members, peer]);

			renderWithProviders(<OrganisationPage />);

			await screen.findByText("Someone Else", { exact: false });
			expect(screen.getAllByRole("button", { name: "Feedback" })).toHaveLength(2);
		});

		it("hides the Feedback button from a plain member for a peer they don't supervise", async () => {
			setActiveAccount({ ...ORG, role: "MEMBER" });
			const self: MemberResponse = { ...members[0], role: "MEMBER" };
			const peer: MemberResponse = {
				userId: "u2",
				displayName: "Someone Else",
				email: "someone@example.com",
				role: "MEMBER",
				departmentId: null,
				groupId: null,
				shareFlowWithPeers: false,
			};
			mockedOrganisationsApi.fetchMembers.mockResolvedValue([self, peer]);

			renderWithProviders(<OrganisationPage />);

			await screen.findByText("Someone Else", { exact: false });
			// Only the caller's own row gets a Feedback button (self-view), not the peer's.
			expect(screen.getAllByRole("button", { name: "Feedback" })).toHaveLength(1);
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

		it("shows an error message if toggling sharing fails", async () => {
			mockedOrganisationsApi.updateMemberSharing.mockRejectedValue(new Error("boom"));
			const user = userEvent.setup();

			renderWithProviders(<OrganisationPage />);

			await screen.findByText("Share my Flow % with my group");
			await user.click(screen.getByLabelText("Share my Flow % with my group"));

			await screen.findByText("Couldn't update that — try again.");
		});

		it("shows an error message if creating a department fails, without losing the typed name", async () => {
			mockedOrganisationsApi.createDepartment.mockRejectedValue(new Error("boom"));
			const user = userEvent.setup();

			renderWithProviders(<OrganisationPage />);

			await screen.findByText("Engineering", { selector: "li.org-structure-list__item > span" });
			await user.type(screen.getByPlaceholderText("New department name"), "Sales");
			await user.click(screen.getByRole("button", { name: "+ Add department" }));

			await screen.findByText("Couldn't create that department — try again.");
			expect(screen.getByPlaceholderText("New department name")).toHaveValue("Sales");
		});

		it("shows an error message if creating a group fails", async () => {
			mockedOrganisationsApi.createGroup.mockRejectedValue(new Error("boom"));
			const user = userEvent.setup();

			renderWithProviders(<OrganisationPage />);

			await screen.findByText("Engineering", { selector: "li.org-structure-list__item > span" });
			await user.type(screen.getByPlaceholderText("New group name"), "Frontend");
			await user.click(screen.getByRole("button", { name: "+ Add group" }));

			await screen.findByText("Couldn't create that group — try again.");
		});

		it("shows an error instead of silently rendering an empty structure when it fails to load", async () => {
			mockedOrganisationsApi.fetchStructure.mockRejectedValue(new Error("boom"));

			renderWithProviders(<OrganisationPage />);

			await screen.findByText("Couldn't load your organisation — try again.");
		});
	});
});
