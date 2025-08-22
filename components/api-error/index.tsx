"use client";
import React, { useEffect, useState } from "react";

export default function ApiError({
  message,
  setMessage,
}: {
  message: string;
  setMessage?: (value: string) => void;
}) {
  const [displayClass, setDisplayClass] = useState("block");

  useEffect(() => {
    setTimeout(() => {
      setDisplayClass("hidden");
      setMessage?.("");
    }, 10000);
  }, []);
  return (
    <p className={`text-destructive text-sm font-medium py-2 ${displayClass}`}>
      {message}
    </p>
  );
}
