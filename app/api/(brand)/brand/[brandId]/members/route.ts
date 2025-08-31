import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import { Membership } from "@/lib/models/membership";
import { Invite } from "@/lib/models/invite";
import User from "@/lib/models/user";
import Brand from "@/lib/models/brand";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { z } from "zod";

type Params = Promise<{ brandId: string }>;

// Get all members of a brand API
export const GET = async (request: Request, context: { params: Params }) => {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }

    const { brandId } = await context.params;

    // Check if the brandId exists and is valid
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    // Establish the database connection
    await connect();

    // Verify that the brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return new NextResponse(
        JSON.stringify({
          message: "Brand does not exist!",
        }),
        { status: 404 }
      );
    }

    // Get all active memberships for this brand
    const memberships = await Membership.find({
      brand_id: brandId,
      status: "active", // Only get active memberships
    })
      .populate({
        path: "user_id",
        select: ["_id", "full_name", "email", "createdAt"],
      })
      .populate({
        path: "created_by",
        select: ["_id", "full_name", "email"],
      })
      .sort({ createdAt: -1 }); // Sort by newest first

    // Get all pending invites for this brand
    const pendingInvites = await Invite.find({
      brand_id: brandId,
      status: "pending", // Only get pending invites
    })
      .populate({
        path: "invited_by",
        select: ["_id", "full_name", "email"],
      })
      .sort({ createdAt: -1 }); // Sort by newest first

    // Transform memberships to the expected format
    const activeMembers = memberships.map((membership) => {
      const user = membership.user_id as any;
      return {
        id: membership._id.toString(),
        userId: user._id.toString(),
        email: user.email,
        fullName: user.full_name,
        role: membership.role,
        status: "active" as const,
        invitedAt: membership.createdAt,
        createdBy: membership.created_by,
        membershipId: membership._id.toString(),
        inviteId: null,
        lastActive: user.createdAt,
      };
    });

    // Transform pending invites to the expected format
    const pendingMembers = pendingInvites.map((invite) => {
      return {
        id: invite._id.toString(),
        userId: null, // No user ID for pending invites
        email: invite.email,
        fullName: null, // No full name for pending invites
        role: invite.role,
        status: "pending" as const,
        invitedAt: invite.createdAt,
        createdBy: invite.invited_by,
        membershipId: null,
        inviteId: invite._id.toString(),
        lastActive: null, // No last active for pending invites
      };
    });

    // Combine active members and pending invites
    const members = [...activeMembers, ...pendingMembers];

    // Also get the brand owner information
    const brandOwner = await User.findById(brand.ownerId).select([
      "_id",
      "full_name",
      "email",
      "createdAt",
    ]);

    // Add the owner to the members list if not already included
    const ownerMembership = members.find(
      (member) => member.userId === brand.ownerId.toString()
    );

    if (!ownerMembership && brandOwner) {
      members.unshift({
        id: `owner-${brandOwner._id}`,
        userId: brandOwner._id.toString(),
        email: brandOwner.email,
        fullName: brandOwner.full_name,
        role: "owner" as const,
        status: "active" as const,
        invitedAt: brand.createdAt,
        createdBy: null,
        membershipId: null,
        inviteId: null,
        lastActive: brandOwner.createdAt,
      });
    }

    return new NextResponse(
      JSON.stringify({
        message: "Brand members fetched successfully!",
        data: {
          brandId: brandId,
          brandName: brand.name,
          totalMembers: members.length,
          members: members,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    return new NextResponse(
      JSON.stringify({
        message: "Error in fetching brand members",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};

// Delete member schema
const DeleteMemberBody = z.object({
  memberIdToRemove: z.string(), // The ID of the member to remove (membership ID or invite ID)
  userIdRequesting: z.string(), // The user requesting the deletion
  memberType: z.enum(["membership", "invite"]), // Whether removing a membership or pending invite
});

// DELETE - Remove member from brand
export const DELETE = async (request: Request, context: { params: Params }) => {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }

    // Validate request body
    const parse = DeleteMemberBody.safeParse(await request.json());
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid request body!",
          error: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 }
      );
    }

    const { memberIdToRemove, userIdRequesting, memberType } = parse.data;
    const { brandId } = await context.params;

    // Connect to database
    await connect();

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return new NextResponse(JSON.stringify({ message: "Brand not found!" }), {
        status: 404,
      });
    }

    // Check if the requesting user has permission (owner or admin)
    const requestingUser = await User.findById(userIdRequesting);
    if (!requestingUser) {
      return new NextResponse(
        JSON.stringify({ message: "Requesting user not found!" }),
        { status: 404 }
      );
    }

    // Check if requesting user is the brand owner
    const isBrandOwner = brand.ownerId.toString() === userIdRequesting;

    // If not brand owner, check if they have admin membership
    let hasAdminPermission = false;
    if (!isBrandOwner) {
      const requestingMembership = await Membership.findOne({
        brand_id: brandId,
        user_id: userIdRequesting,
        status: "active",
        role: { $in: ["owner", "admin"] },
      });
      hasAdminPermission = !!requestingMembership;
    }

    if (!isBrandOwner && !hasAdminPermission) {
      return new NextResponse(
        JSON.stringify({
          message:
            "You do not have permission to remove members from this brand.",
        }),
        { status: 403 }
      );
    }

    let removedMember: any = null;

    if (memberType === "membership") {
      // Remove active membership
      const membership = await Membership.findById(memberIdToRemove);
      if (!membership) {
        return new NextResponse(
          JSON.stringify({ message: "Membership not found!" }),
          { status: 404 }
        );
      }

      // Prevent removing the brand owner
      if (membership.user_id.toString() === brand.ownerId.toString()) {
        return new NextResponse(
          JSON.stringify({
            message: "Cannot remove the brand owner from the brand.",
          }),
          { status: 400 }
        );
      }

      // Prevent users from removing themselves
      if (membership.user_id.toString() === userIdRequesting) {
        return new NextResponse(
          JSON.stringify({
            message: "You cannot remove yourself from the brand.",
          }),
          { status: 400 }
        );
      }

      // Get user info before deletion for response
      const memberUser = await User.findById(membership.user_id);
      removedMember = {
        email: memberUser?.email,
        fullName: memberUser?.full_name,
        role: membership.role,
        type: "membership",
      };

      // Delete the membership
      await Membership.findByIdAndDelete(memberIdToRemove);
    } else if (memberType === "invite") {
      // Remove pending invite
      const invite = await Invite.findById(memberIdToRemove);
      if (!invite) {
        return new NextResponse(
          JSON.stringify({ message: "Invite not found!" }),
          { status: 404 }
        );
      }

      removedMember = {
        email: invite.email,
        fullName: null,
        role: invite.role,
        type: "invite",
      };

      // Delete the invite
      await Invite.findByIdAndDelete(memberIdToRemove);
    }

    return new NextResponse(
      JSON.stringify({
        message: "Member removed successfully!",
        data: {
          removedMember,
          brandId: brandId,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error removing member",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
