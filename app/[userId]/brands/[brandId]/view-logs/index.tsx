import React from "react";

export default function ViewLogs({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  return (
    <div>
      View Logs for a brand {userId} {brandId}
    </div>
  );
}
