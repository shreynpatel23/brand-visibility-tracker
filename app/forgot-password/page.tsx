"use client";
import React, { useState } from "react";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/logo";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

const ForgotPasswordPage: React.FC = () => {
  const [emailSent, setEmailSent] = useState({
    toggle: false,
    value: "",
  });

  if (emailSent.toggle) {
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
              Check your email
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              We've sent a password reset link to{" "}
              <span className="font-bold text-foreground">
                {emailSent.value}
              </span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <div className="flex">
                <Mail className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Email sent successfully
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <p>
                      Click the link in the email to reset your password. If you
                      don't see it, check your spam folder.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Didn't receive the email?
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent({
                    toggle: false,
                    value: "",
                  });
                }}
                className="w-full"
              >
                Try again
              </Button>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="flex items-center justify-center text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Forgot your password?
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you a link to reset your
            password
          </p>
        </div>

        <ForgotPasswordForm
          onSuccess={(email) => {
            setEmailSent({
              toggle: true,
              value: email,
            });
          }}
        />

        <div className="text-center">
          <Link
            href="/login"
            className="flex items-center justify-center text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
