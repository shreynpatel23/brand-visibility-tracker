"use client";

import { ModeToggle } from "../mode-toggle";

export default function Header() {
  return (
    <div className="w-full flex items-center h-[10%] px-4 bg-background border-b border-border">
      <h1 className="text-2xl font-bold">Brand Visibility Tracker</h1>
      <div className="ml-auto">
        <ModeToggle />
      </div>
    </div>
  );
}
