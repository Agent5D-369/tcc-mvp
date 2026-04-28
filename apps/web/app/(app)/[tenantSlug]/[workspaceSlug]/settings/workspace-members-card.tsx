"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type Member = {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  isDefaultWorkspace: boolean;
  joinedAt: string;
};

type WorkspaceMembersCardProps = {
  members: Member[];
  currentUserId: string;
  canManage: boolean;
  currentUserRole: string;
};

const roleOptions = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
] as const;

export function WorkspaceMembersCard({
  members,
  currentUserId,
  canManage,
  currentUserRole,
}: WorkspaceMembersCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "manager" | "member" | "guest">("member");
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((member) => [member.membershipId, member.role])),
  );
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const roleByMembership = useMemo(
    () => Object.fromEntries(members.map((member) => [member.membershipId, member.role])),
    [members],
  );

  async function addMember() {
    setIsSaving("invite");

    const response = await fetch("/api/memberships", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        role: inviteRole,
      }),
    });

    const { error } = await readApiResult(response);
    setIsSaving(null);

    if (!response.ok) {
      pushToast(error || "Could not add the member", "error");
      return;
    }

    pushToast("Member access updated");
    setEmail("");
    setInviteRole("member");
    router.refresh();
  }

  async function updateRole(membershipId: string) {
    setIsSaving(membershipId);

    const response = await fetch(`/api/memberships/${membershipId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: draftRoles[membershipId],
      }),
    });

    const { error } = await readApiResult(response);
    setIsSaving(null);

    if (!response.ok) {
      pushToast(error || "Could not update the role", "error");
      return;
    }

    pushToast("Role updated");
    router.refresh();
  }

  async function removeMember(membershipId: string) {
    setIsSaving(`delete-${membershipId}`);

    const response = await fetch(`/api/memberships/${membershipId}`, {
      method: "DELETE",
    });

    const { error } = await readApiResult(response);
    setIsSaving(null);

    if (!response.ok) {
      pushToast(error || "Could not remove the member", "error");
      return;
    }

    pushToast("Member removed");
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <div className="kicker">Team access</div>
          <h2 className="section-title">Review people and roles</h2>
        </div>
        <p className="empty-note">Keep roles quiet and explicit. Add by email; access becomes live when they sign in with that same address.</p>
      </div>

      {canManage ? (
        <div className="form-grid member-invite-card">
          <label>
            <span className="field-label">Member email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              type="email"
            />
          </label>
          <label>
            <span className="field-label">Role</span>
            <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)}>
              {roleOptions
                .filter((option) => currentUserRole === "owner" || option.value !== "owner")
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="button-primary"
            type="button"
            disabled={!email.trim() || isSaving === "invite"}
            onClick={() => void addMember()}
          >
            {isSaving === "invite" ? "Adding..." : "Add member"}
          </button>
        </div>
      ) : null}

      <div className="admin-record-list">
        {members.map((member) => {
          const draftRole = draftRoles[member.membershipId] ?? member.role;
          const roleChanged = draftRole !== roleByMembership[member.membershipId];
          const isCurrentUser = member.userId === currentUserId;

          return (
            <article key={member.membershipId} className="record-card compact-record-card">
              <div className="record-card-copy">
                <div className="meta-row">
                  <strong>{member.fullName || member.email}</strong>
                  <span className="badge badge-neutral">{member.role}</span>
                  {member.isDefaultWorkspace ? <span className="badge badge-neutral">default</span> : null}
                </div>
                <div className="entity-summary-meta">
                  <span>{member.email}</span>
                  <span>{new Date(member.joinedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {canManage ? (
                <div className="record-card-actions admin-inline-actions">
                  <label>
                    <span className="field-label">Role</span>
                    <select
                      value={draftRole}
                      onChange={(event) => setDraftRoles((current) => ({
                        ...current,
                        [member.membershipId]: event.target.value,
                      }))}
                    >
                      {roleOptions
                        .filter((option) => currentUserRole === "owner" || option.value !== "owner")
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  </label>

                  <div className="meta-row">
                    <button
                      className="button-secondary"
                      type="button"
                      disabled={!roleChanged || isSaving === member.membershipId}
                      onClick={() => void updateRole(member.membershipId)}
                    >
                      {isSaving === member.membershipId ? "Saving..." : "Update"}
                    </button>
                    <button
                      className="button-secondary button-danger"
                      type="button"
                      disabled={isCurrentUser || isSaving === `delete-${member.membershipId}`}
                      onClick={() => void removeMember(member.membershipId)}
                    >
                      {isSaving === `delete-${member.membershipId}` ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
