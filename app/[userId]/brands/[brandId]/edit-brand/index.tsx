import React from "react";

export default function EditBrand({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  return (
    <div>
      Edit brand for user - {userId} brand - {brandId}
    </div>
  );
}
