import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import Brand from "@/lib/models/brand";
import User from "@/lib/models/user";
import { Invite } from "@/lib/models/invite";
import { Membership } from "@/lib/models/membership";
import connect from "@/lib/db";
import { Types } from "mongoose";
import { PlanTypes } from "@/types";
import { CreditService } from "@/lib/services/creditService";

const AcceptInviteBody = z.object({
  brandId: z.string(),
  invitedBy: z.string(),
  verifyToken: z.string().min(10),
  email: z.string().email(),
  signup: z
    .object({
      full_name: z.string().min(2).max(120),
      password: z.string().min(6).max(128),
    })
    .optional(),
});

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  // Parse and validate the request body
  const parse = AcceptInviteBody.safeParse(await request.json());
  if (!parse.success) {
    return new NextResponse(
      JSON.stringify({
        message: "Invalid request body!",
        data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
      }),
      { status: 400 }
    );
  }

  // connect to the database
  await connect();

  // extract the brandId from params
  const { verifyToken, email, signup, invitedBy, brandId } = parse.data;

  // verify brand exists
  const brand = await Brand.findById(brandId);
  if (!brand) {
    return new NextResponse(
      JSON.stringify({ message: "Brand does not exist!" }),
      { status: 400 }
    );
  }
  const now = new Date();

  // Find a live, pending invite by hashed token
  const invite = await Invite.findOne({
    verify_token: hashToken(verifyToken),
    brand_id: brandId,
    email: email.toLowerCase(),
    status: "pending",
    verify_token_expire: { $gt: now },
  });

  if (!invite) {
    // Could be expired, consumed, or invalid
    return new NextResponse(
      JSON.stringify({ message: "Invite is invalid or has expired." }),
      { status: 400 }
    );
  }

  // Email must match
  const inviteEmail = String(invite.email).toLowerCase();
  const userEmail = String(email).toLowerCase();
  if (inviteEmail !== userEmail) {
    return new NextResponse(
      JSON.stringify({
        message:
          "This invite was sent to a different email address. Please sign in with the invited email.",
      }),
      { status: 409 }
    );
  }

  if (invite.role === "owner") {
    const existingOwner = await Membership.findOne({
      brand_id: brandId,
      role: "owner",
      status: "active",
    });
    if (existingOwner) {
      return new NextResponse(
        JSON.stringify({ message: "This brand already has an owner." }),
        { status: 409 }
      );
    }
  }

  try {
    const existingUser = await User.findOne({ email: inviteEmail });
    let user;

    // if the user does not exist, create one
    if (!existingUser) {
      // encrypt the password using bcrypt
      if (!signup?.password) {
        throw new Error("Password is required for signup.");
      }
      const hashedPassword = await bcrypt.hash(signup.password, 12);

      const newUser = new User({
        full_name: signup?.full_name,
        email: inviteEmail,
        password: hashedPassword,
        is_verified: true,
        current_onboarding_step: null,
      });
      user = newUser;
      await newUser.save();

      // Assign free credits to new user
      try {
        await CreditService.assignFreeCredits(newUser._id.toString());
      } catch (error) {
        console.error("Error assigning free credits:", error);
        // Don't fail invite acceptance if credit assignment fails
      }
    } else {
      user = existingUser;
    }

    // Check if membership already exists to prevent duplicates
    const existingMembership = await Membership.findOne({
      brand_id: brand._id,
      user_id: user._id,
      status: "active",
    });

    if (existingMembership) {
      return new NextResponse(
        JSON.stringify({
          message: "User is already a member of this brand.",
          data: { user },
        }),
        { status: 409 }
      );
    }

    // add in the membership table with role as invite
    const membership = new Membership({
      brand_id: brand._id,
      user_id: user._id,
      role: invite.role,
      status: "active",
      created_by: invitedBy,
    });

    // Update the specific invite that was used
    const updatedInvite = await Invite.findOneAndUpdate(
      { _id: invite._id },
      {
        status: "accepted",
        accepted_at: new Date(),
        verify_token: undefined,
        verify_token_expire: undefined,
      },
      {
        new: true,
      }
    );

    // Also update any other pending invites for the same email/brand to prevent duplicates
    await Invite.updateMany(
      {
        brand_id: brandId,
        email: email.toLowerCase(),
        status: "pending",
        _id: { $ne: invite._id }, // Don't update the one we just updated
      },
      {
        status: "expired",
        verify_token: undefined,
        verify_token_expire: undefined,
      }
    );

    // check if the process successed
    if (!updatedInvite) {
      return new NextResponse(
        JSON.stringify({ message: "Invite not updated!" }),
        { status: 400 }
      );
    }

    await membership.save();

    return new NextResponse(
      JSON.stringify({
        message: "Invite accepted. Membership activated.",
        data: {
          user,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    return new NextResponse("Error in accepting invite " + err, {
      status: 500,
    });
  }
}
