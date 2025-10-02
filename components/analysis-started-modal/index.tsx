"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Mail } from "lucide-react";

interface AnalysisStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandName?: string;
  userEmail?: string;
}

export default function AnalysisStartedModal({
  isOpen,
  onClose,
  brandName = "your brand",
  userEmail,
}: AnalysisStartedModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Analysis Started Successfully!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900">
                Analysis is now running in the background
              </p>
              <p className="text-sm text-green-700 mt-1">
                We&apos;ve started analyzing the brand visibility for{" "}
                <strong>{brandName}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">
                Estimated completion time
              </p>
              <p className="text-sm text-blue-700 mt-1">
                5-10 minutes depending on the analysis scope
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <Mail className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-purple-900">Email notification</p>
              <p className="text-sm text-purple-700 mt-1">
                We&apos;ll send you an email at{" "}
                <strong>{userEmail || "your registered email"}</strong> once the
                analysis is complete with detailed results.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>What happens next?</strong>
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
              <li>• You can continue using the platform normally</li>
              <li>• Check your email for completion notification</li>
              <li>• View results in the dashboard once complete</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Got it, thanks!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
