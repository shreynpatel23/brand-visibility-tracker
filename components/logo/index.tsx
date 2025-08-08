import { Building2 } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center cursor-pointer">
      <Building2 className="h-8 w-8 text-accent" />
      <span className="ml-2 text-2xl font-bold text-gray-900 dark:text-white">
        BrandViz
      </span>
    </Link>
  );
}
