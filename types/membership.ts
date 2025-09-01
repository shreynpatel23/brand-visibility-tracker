import { Types } from "mongoose";

// Member roles
export type Role = "owner" | "admin" | "viewer";

// Member status
export type Status = "active" | "suspended";

// Invite status
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

// Database Membership model
export interface IMembership {
  _id: Types.ObjectId;
  brand_id: Types.ObjectId;
  user_id: Types.ObjectId;
  role: Role;
  status: Status;
  created_by?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Database Invite model
export interface IInvite {
  _id: Types.ObjectId;
  brand_id: Types.ObjectId;
  email: string;
  role: Role;
  invited_by: Types.ObjectId;
  verify_token?: string;
  verify_token_expire?: Date;
  accepted_at?: Date | null;
  revoked_at?: Date | null;
  status: InviteStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Client-side Brand Member representation
export interface BrandMember {
  id: string;
  userId: string | null; // null for pending invites
  email: string;
  fullName: string | null; // null for pending invites
  role: Role;
  status: "active" | "suspended" | "pending";
  invitedAt: Date | string;
  createdBy?: {
    _id: string;
    full_name: string;
    email: string;
  } | null;
  invitedBy?: {
    _id: string;
    full_name: string;
    email: string;
  } | null;
  membershipId: string | null;
  inviteId: string | null;
  lastActive?: Date | string | null; // null for pending invites
}

// API response for brand members
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

// Invite data for accept invite page
export interface InviteData {
  name: string;
  category: string;
  ownerId: {
    _id: string;
    full_name: string;
    email: string;
  };
  invitedBy: {
    _id: string;
    full_name: string;
    email: string;
  };
}

// Team member for onboarding
export interface TeamMember {
  email: string;
  role: string;
}
