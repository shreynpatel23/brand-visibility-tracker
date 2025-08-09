"use client";

import { ArrowLeft, X } from "lucide-react";
import { useState } from "react";
import { IOnboardingForm } from "./onboarding-form";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export function InviteTeamMemberForm({
  formData,
  currentStep,
  setCurrentStep,
}: {
  formData: IOnboardingForm | undefined;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}) {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState([
    { email: "", role: "Editor" },
  ]);
  const roles = ["Admin", "Editor", "Viewer"];

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { email: "", role: "Editor" }]);
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

  const handleComplete = () => {
    // Here you would normally save the data to your backend
    console.log("form data:", formData);
    console.log("Team members:", teamMembers);
    router.push("/dashboard");
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
            <select
              value={member.role}
              onChange={(e) => updateTeamMember(index, "role", e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
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

      <div className="flex justify-between mt-8">
        <Button
          variant={"outline"}
          onClick={() => setCurrentStep(currentStep - 1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="ml-auto space-x-3">
          <Button variant={"outline"} onClick={handleComplete}>
            Skip for now
          </Button>
          <Button onClick={handleComplete}>Go to Dashboard</Button>
        </div>
      </div>
    </>
  );
}
