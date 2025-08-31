"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { postData } from "@/utils/fetch";
import ApiError from "../api-error";
import Loading from "../loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InviteTeamMemberForm({
  userId,
  brandId,
  showSkip = false,
  onSuccess,
}: {
  userId: string;
  brandId: string;
  showSkip?: boolean;
  onSuccess: (
    data: { email: string; status: string; message: string }[]
  ) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const roles = ["Admin", "Viewer"];
  const [teamMembers, setTeamMembers] = useState([
    { email: "", role: roles[0] },
  ]);
  const [error, setError] = useState<string | null>(null);

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { email: "", role: roles[0] }]);
  };

  const updateTeamMember = (index: number, field: string, value: string) => {
    const updated = teamMembers.map((member, i) =>
      i === index ? { ...member, [field]: value } : member
    );
    setTeamMembers(updated);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const response = await postData(`/api/brand/${brandId}/invites`, {
        emails: teamMembers.map((member) => ({
          email: member.email.toLowerCase(),
          role: member.role.toLowerCase(),
        })),
        user_id: userId,
      });
      const { data } = response;
      onSuccess(data);
    } catch (error) {
      setError(
        `invite memeber failed - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {teamMembers.map((member, index) => (
          <div
            key={index}
            className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <input
              type="email"
              value={member.email}
              onChange={(e) => updateTeamMember(index, "email", e.target.value)}
              placeholder="team@example.com"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <Select
              value={member.role}
              onValueChange={(value) => updateTeamMember(index, "role", value)}
            >
              <SelectTrigger className="w-fit">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamMembers.length > 1 && (
              <button
                type="button"
                onClick={() => removeTeamMember(index)}
                className="p-2 text-red-400 hover:text-red-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addTeamMember}
          className="w-full py-2 px-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-accent hover:text-accent transition-colors"
        >
          + Add team member
        </button>
      </div>

      {error && (
        <ApiError message={error} setMessage={(value) => setError(value)} />
      )}

      <div className="flex justify-between mt-8">
        {showSkip && (
          <Button
            variant={"outline"}
            onClick={() => router.push(`/${userId}/brands`)}
          >
            Skip for now
          </Button>
        )}
        <div className="ml-auto">
          <Button
            disabled={loading || !brandId}
            variant={loading ? "outline" : "default"}
            onClick={handleComplete}
          >
            {loading ? (
              <Loading message="Inviting members..." />
            ) : teamMembers.length > 1 ? (
              "Invite Members"
            ) : (
              "Invite Member"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
