export interface BrandMember {
  id: string;
  userId: string | null; // null for pending invites
  email: string;
  fullName: string | null; // null for pending invites
  role: "owner" | "admin" | "viewer";
  status: "active" | "suspended" | "pending";
  invitedAt: Date | string;
  createdBy?: {
    _id: string;
    full_name: string;
    email: string;
  } | null;
  membershipId: string | null;
  inviteId: string | null; // new field for invite ID
  lastActive?: Date | string | null; // null for pending invites
}

export interface BrandMembersResponse {
  brandId: string;
  brandName: string;
  totalMembers: number;
  members: BrandMember[];
}

export interface BrandMembersApiResponse {
  message: string;
  data: BrandMembersResponse;
}
