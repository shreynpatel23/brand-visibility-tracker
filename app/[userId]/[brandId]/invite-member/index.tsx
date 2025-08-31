"use client";

import ApiError from "@/components/api-error";
import { InviteTeamMemberForm } from "@/components/forms/invite-member-form";
import { IOnboardingForm } from "@/components/forms/onboarding-form";
import Loading from "@/components/loading";
import Logo from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { fetchData } from "@/utils/fetch";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";

export default function InviteMemberPage({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  const [currentStep] = useState(2);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<IOnboardingForm | undefined>(
    undefined
  );
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBrand() {
      try {
        const response = await fetchData(`/api/brand/${brandId}`);
        const { data } = response;
        setFormData(data);
      } catch (error) {
        setError(
          `Error in creating brand - ${
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

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <Loading message="Fetching brand details..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-10 right-10">
        <ModeToggle />
      </div>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center my-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to Brand Visibility Tracker
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Let's get you set up in just a few steps
          </p>
        </div>

        {/* Progress indicator */}
        <div className="my-12">
          <div className="flex items-start justify-center space-x-4">
            <div className="flex flex-col items-center gap-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= 1
                    ? "bg-accent text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                1
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create Brand
              </p>
            </div>
            <div
              className={`h-1 w-16 mt-5 ${
                currentStep >= 2 ? "bg-accent" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
            <div className="flex flex-col gap-4 items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= 2
                    ? "bg-accent text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                2
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Invite Team
              </p>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-accent mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Invite Your Team
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Add team members to collaborate on brand tracking (optional)
                </p>
              </div>

              {error && (
                <ApiError
                  message={error}
                  setMessage={(value) => setError(value)}
                />
              )}
              <InviteTeamMemberForm userId={userId} formData={formData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
