"use client";
import React, { useState } from "react";
import { Mail, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import Loading from "@/components/loading";
import { postData } from "@/utils/fetch";
import ApiSuccess from "@/components/api-success";
import { ModeToggle } from "@/components/mode-toggle";

const EmailVerificationPage: React.FC = () => {
  const router = useRouter();
  const userId =
    (typeof window !== "undefined" && localStorage.getItem("userId")) ?? "";
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const handleResendEmail = async () => {
    if (!email) {
      setError("Email address is required to resend verification.");
      return;
    }

    setResending(true);
    setError("");

    try {
      // Simulate API call to resend verification email
      const response = await postData(`/api/resend-verification-email`, {
        userId,
      });
      const { message } = await response;
      // Show success message
      setError("");
      setSuccessMessage(message);
      setResending(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      setResending(false);
    }
  };

  // Show error state if no email provided
  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-10 right-10">
          <ModeToggle />
        </div>
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              No Email Provided
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              It seems you have not provided an email address to verify.
            </p>
            <Button onClick={() => router.push("/signup")} className="mt-4">
              Go to Signup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show email sent confirmation (waiting for user to click link)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-10 right-10">
        <ModeToggle />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            We&apos;ve sent a verification link to
          </p>
          <p className="font-medium text-gray-900 dark:text-white">{email}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <div className="flex">
            <Mail className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Verification email sent
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Click the verification link in your email to activate your
                  account. If you don&apos;t see it, check your spam folder.
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Verification failed
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Didn&apos;t receive the email?
            </p>
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full"
            >
              {resending ? (
                <Loading message="Sending..." />
              ) : (
                <span className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Resend verification email
                </span>
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Wrong email address?{" "}
              <button
                onClick={() => router.push("/signup")}
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Go back to signup
              </button>
            </p>
          </div>

          {successMessage && (
            <div className="flex justify-center">
              <ApiSuccess
                message={successMessage}
                setMessage={(value) => setSuccessMessage(value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
