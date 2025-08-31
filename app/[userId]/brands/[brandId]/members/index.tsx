"use client";

import ApiError from "@/components/api-error";
import { InviteTeamMemberForm } from "@/components/forms/invite-member-form";
import Loading from "@/components/loading";
import { fetchData, patchData, deleteData } from "@/utils/fetch";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandMember } from "@/types/member";

export default function MembersPage({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(
    null
  );
  const [memberToDelete, setMemberToDelete] = useState<BrandMember | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Team members data from API
  const [teamMembers, setTeamMembers] = useState<BrandMember[]>([]);

  // Get current user's role and member info
  const currentUser = teamMembers.find((member) => member.userId === userId);
  const currentUserRole = currentUser?.role || null;

  // Check if current user can perform admin actions (owner or admin)
  const canPerformActions =
    currentUserRole && ["owner", "admin"].includes(currentUserRole);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetchData(`/api/brand/${brandId}/members`);
      const { data } = response;
      setTeamMembers(data.members);
    } catch (error) {
      setError(
        `Error in fetching members - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (brandId && userId) {
      fetchMembers();
    }
  }, [userId, brandId]);

  const handleResendInvite = async (member: BrandMember) => {
    if (!member.inviteId) {
      toast.error("Cannot resend invite - invite ID not found");
      return;
    }

    // Set loading state for this member
    setResendingInviteId(member.id);

    try {
      await patchData(`/api/brand/${brandId}/invites`, {
        inviteId: member.inviteId,
        user_id: userId,
      });

      toast.success(`Invite resent successfully to ${member.email}`);

      // Refresh the members list to get updated data
      fetchMembers();
    } catch (error) {
      toast.error(
        `Failed to resend invite to ${member.email}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      // Clear loading state
      setResendingInviteId(null);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    setIsDeleting(true);
    try {
      // Determine if it's a membership or invite
      const memberType =
        memberToDelete.status === "pending" ? "invite" : "membership";
      const memberIdToRemove =
        memberType === "invite"
          ? memberToDelete.inviteId
          : memberToDelete.membershipId;

      if (!memberIdToRemove) {
        toast.error("Cannot delete member - missing ID");
        return;
      }

      await deleteData(`/api/brand/${brandId}/members`, {
        memberIdToRemove,
        userIdRequesting: userId,
        memberType,
      });

      // Remove member from local state
      setTeamMembers((prev) =>
        prev.filter((member) => member.id !== memberToDelete.id)
      );

      toast.success(
        `${
          memberToDelete.fullName || memberToDelete.email
        } has been removed from the brand`
      );

      // Close dialog and reset state
      setIsDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (error) {
      toast.error(
        `Failed to remove member: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (member: BrandMember) => {
    setMemberToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "viewer":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "suspended":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading message="Loading members..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground">
            Team Members
          </h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
            Manage team access and permissions for this brand
          </p>
        </div>
        {canPerformActions && (
          <Button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <ApiError message={error} setMessage={(value) => setError(value)} />
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Invite Team Member
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Send an invitation to collaborate on this brand
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteForm(false)}
            >
              Cancel
            </Button>
          </div>
          <InviteTeamMemberForm
            userId={userId}
            brandId={brandId}
            onSuccess={(data) => {
              // Separate successful and failed invites
              const successfulInvites = data.filter(
                (invite) => invite.status === "invited"
              );
              const failedInvites = data.filter(
                (invite) => invite.status !== "invited"
              );

              // Show success toast for successful invites
              if (successfulInvites.length > 0) {
                const successMessage =
                  successfulInvites.length === 1
                    ? `Successfully invited ${successfulInvites[0].email}`
                    : `Successfully invited ${successfulInvites.length} members`;
                toast.success(successMessage);
              }

              // Show error toast for failed invites
              if (failedInvites.length > 0) {
                const errorMessage =
                  failedInvites.length === 1
                    ? `Failed to invite ${failedInvites[0].email}: ${failedInvites[0].message}`
                    : `Failed to invite ${failedInvites.length} members. Check console for details.`;
                toast.error(errorMessage);
              }

              // Refresh the members list to show newly invited members
              fetchMembers();

              // Always close form
              setShowInviteForm(false);
            }}
          />
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 dark:bg-accent/10 rounded-lg">
                <Users className="w-5 h-5 text-accent dark:text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground dark:text-foreground">
                  Current Team Members
                </h3>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  {teamMembers.length} members with access to this brand
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-foreground dark:text-foreground">
                    Member
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground dark:text-foreground">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground dark:text-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground dark:text-foreground">
                    Invited
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground dark:text-foreground">
                    Last Active
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-foreground dark:text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member, index) => {
                  const isCurrentUser = member.userId === userId;
                  return (
                    <tr
                      key={member.id}
                      className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        index % 2 === 0
                          ? "bg-gray-50/50 dark:bg-gray-800/50"
                          : ""
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {member.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {member.fullName || member.email}
                              </p>
                              {isCurrentUser && (
                                <Badge variant="secondary">You</Badge>
                              )}
                            </div>
                            {member.fullName && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {member.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                            member.role
                          )}`}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          {member.role.charAt(0).toUpperCase() +
                            member.role.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            member.status
                          )}`}
                        >
                          {member.status.charAt(0).toUpperCase() +
                            member.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(
                            typeof member.invitedAt === "string"
                              ? member.invitedAt
                              : member.invitedAt.toString()
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {member.lastActive
                            ? formatDate(
                                typeof member.lastActive === "string"
                                  ? member.lastActive
                                  : member.lastActive.toString()
                              )
                            : "Never"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {canPerformActions ? (
                          <div className="flex items-center justify-end gap-2">
                            {member.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendInvite(member)}
                                disabled={resendingInviteId === member.id}
                              >
                                {resendingInviteId === member.id
                                  ? "Sending..."
                                  : "Resend"}
                              </Button>
                            )}
                            {/* Don't allow users to remove themselves */}
                            {!isCurrentUser && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-white"
                                onClick={() => openDeleteDialog(member)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            No actions available
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {teamMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No team members yet
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Invite team members to collaborate on this brand.
              </p>
              {canPerformActions && (
                <div className="mt-6">
                  <Button onClick={() => setShowInviteForm(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Your First Member
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Permissions Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          Role Permissions
        </h4>
        <div className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
          <p>
            <strong>Owner:</strong> Full access including member management and
            brand settings
          </p>
          <p>
            <strong>Admin:</strong> Can view analytics, logs, and contribute to
            brand tracking
          </p>
          <p>
            <strong>Viewer:</strong> Read-only access to analytics and reports
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Remove Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium">
                {memberToDelete?.fullName || memberToDelete?.email}
              </span>{" "}
              from this brand? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {memberToDelete?.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {memberToDelete?.fullName || memberToDelete?.email}
                  </p>
                  {memberToDelete?.fullName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {memberToDelete.email}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {memberToDelete?.role}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {memberToDelete?.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loading message="" />
                  <span className="ml-2">Removing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
