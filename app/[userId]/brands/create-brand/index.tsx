"use client";

import { CreateBrandForm } from "@/components/forms/create-brand-form";
import Logo from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreateBrand({ userId }: { userId: string }) {
  const router = useRouter();

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
            Create New Brand
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Add a new brand to track its visibility and performance
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="text-gray-600 dark:text-gray-400 hover:text-white dark:hover:text-white"
            onClick={() => router.push(`/${userId}/brands`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Brands
          </Button>
        </div>

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="space-y-4">
            <div className="text-center mt-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Brand Information
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Tell us about the brand you want to add to your tracking
                dashboard
              </p>
            </div>
            <CreateBrandForm userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
}
