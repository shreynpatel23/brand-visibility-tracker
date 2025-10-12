"use client";
import React, { useState, useEffect } from "react";
import { Users, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { AcceptInviteMemberForm } from "@/components/forms/accept-invite-member-form";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fetchData, postData } from "@/utils/fetch";
import Logo from "@/components/logo";
import Loading from "@/components/loading";
import { InviteData } from "@/types/membership";

const AcceptInvitePage = ({ brandId }: { brandId: string }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData>();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("verifyToken");
  const email = searchParams.get("email");
  const existingUserId = searchParams.get("user_id");

  //   Fetch invite data on component mount
  useEffect(() => {
    const fetchInviteData = async () => {
      if (!token || !email) {
        setError("Invalid invitation link");
        setInviteLoading(false);
        return;
      }

      try {
        const response = await fetchData(
          `/api/brand/${brandId}?email=${encodeURIComponent(email)}`
        );
        const { data } = response;
        setInviteData(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setInviteLoading(false);
      }
    };

    fetchInviteData();
  }, [token, email, brandId]);

  // Loading state
  if (inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Loading Invitation
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Please wait while we verify your invitation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Welcome to the Team!
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Your invitation has been accepted successfully. You will be
              redirected to the dashboard shortly.
            </p>
            <div className="mt-4">
              <Loader className="h-5 w-5 text-primary animate-spin mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Invalid Invitation
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This invitation link is invalid or has expired.
            </p>
            <Button onClick={() => router.push("/signup")} className="mt-4">
              Go to Signup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function handleAcceptInvite() {
    setLoading(true);
    try {
      const response = await postData(`/api/brand/${brandId}/accept-invite`, {
        brandId,
        invitedBy: inviteData?.invitedBy._id,
        verifyToken: token,
        email,
      });
      const { data } = response;
      const { user } = data;
      setSuccess(true);
      setTimeout(() => {
        router.push(`/${user._id}/brands/${brandId}/dashboard`);
      }, 5000);
    } catch (error) {
      setError(
        `Accept Invite Failed - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  // Main form
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Join the team
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You&apos;ve been invited to collaborate on brand tracking
          </p>
        </div>

        {/* Invitation Details */}
        {inviteData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {inviteData?.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {inviteData?.category}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Invited by:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {inviteData.invitedBy.full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {inviteData.invitedBy.email}
                </span>
              </div>
            </div>
          </div>
        )}

        {existingUserId ? (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Accept Invitation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Click the button below to join the team and start collaborating.
              </p>

              <Button
                onClick={handleAcceptInvite}
                disabled={loading}
                className="w-full"
                variant={loading ? "outline" : "default"}
              >
                {loading ? (
                  <Loading message="Accepting invite..." />
                ) : (
                  "Accept Invite"
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Account Creation Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Create your account
              </h3>

              <AcceptInviteMemberForm
                invitedBy={inviteData?.invitedBy._id || ""}
                token={token || ""}
                email={email || ""}
                brandId={brandId}
              />
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <button
                  onClick={() => router.push(`/login?email=${email}`)}
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Sign in instead
                </button>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitePage;
