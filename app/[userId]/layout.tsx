"use client";

import React from "react";
import { MatrixProvider } from "@/context/matrixContext";
import { useUserContext } from "@/context/userContext";

interface UserLayoutProps {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const { user } = useUserContext();

  return <MatrixProvider userId={user._id}>{children}</MatrixProvider>;
}
