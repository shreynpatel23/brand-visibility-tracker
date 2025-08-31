"use client";

import ApiError from "@/components/api-error";
import { InviteTeamMemberForm } from "@/components/forms/invite-member-form";
import { IOnboardingForm } from "@/components/forms/onboarding-form";
import Loading from "@/components/loading";
import { fetchData } from "@/utils/fetch";
import { Users, UserPlus, Mail, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface TeamMember {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  status: "pending" | "active" | "inactive";
  invitedAt: string;
  lastActive?: string;
}

export default function MembersPage({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<IOnboardingForm | undefined>(
    undefined
  );
  const [error, setError] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Mock team members data
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: "1",
      email: "john.doe@example.com",
      role: "admin",
      status: "active",
      invitedAt: "2024-01-10T10:00:00Z",
      lastActive: "2024-01-15T14:30:00Z",
    },
    {
      id: "2",
      email: "jane.smith@example.com",
      role: "member",
      status: "active",
      invitedAt: "2024-01-12T09:00:00Z",
      lastActive: "2024-01-15T12:15:00Z",
    },
    {
      id: "3",
      email: "bob.wilson@example.com",
      role: "viewer",
      status: "pending",
      invitedAt: "2024-01-14T16:00:00Z",
    },
  ]);

  useEffect(() => {
    async function fetchBrand() {
      try {
        const response = await fetchData(`/api/brand/${brandId}`);
        const { data } = response;
        setFormData(data);
      } catch (error) {
        setError(
          `Error in fetching brand - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    }

    if (brandId && userId) {
      setLoading(true);
      fetchBrand();
    }
  }, [userId, brandId]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "member":
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
      case "inactive":
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
        <Loading message="Fetching brand details..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Team Members
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage team access and permissions for this brand
          </p>
        </div>
        <Button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </Button>
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
          <InviteTeamMemberForm userId={userId} formData={formData} />
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Current Team Members
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {teamMembers.length} members with access to this brand
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Member
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Invited
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Last Active
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member, index) => (
                  <tr
                    key={member.id}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      index % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-800/50" : ""
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {member.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.email}
                          </p>
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
                        {formatDate(member.invitedAt)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {member.lastActive
                          ? formatDate(member.lastActive)
                          : "Never"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {member.status === "pending" && (
                          <Button variant="outline" size="sm">
                            Resend
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <div className="mt-6">
                <Button onClick={() => setShowInviteForm(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Your First Member
                </Button>
              </div>
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
            <strong>Admin:</strong> Full access including member management and
            brand settings
          </p>
          <p>
            <strong>Member:</strong> Can view analytics, logs, and contribute to
            brand tracking
          </p>
          <p>
            <strong>Viewer:</strong> Read-only access to analytics and reports
          </p>
        </div>
      </div>
    </div>
  );
}
