import { RefreshCw } from "lucide-react";
import React from "react";

export default function Loading({ message }: { message: string }) {
  return (
    <span className="flex items-center">
      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
      {message}
    </span>
  );
}
