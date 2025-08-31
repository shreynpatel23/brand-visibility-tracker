import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import Brand from "@/lib/models/brand";
import { Membership } from "@/lib/models/membership";
import { ObjectIdString } from "@/utils/mongoose";
import connect from "@/lib/db";
import User from "@/lib/models/user";
import { IInvite, Invite } from "@/lib/models/invite";
import { inviteMemberEmailTemplate } from "@/utils/inviteMemberEmailTempelate";
import { sendEmail } from "@/utils/sendEmail";

// Update: email is now an array of strings
const MultiInviteBody = z.object({
  user_id: ObjectIdString,
  emails: z
    .array(
      z.object({
        email: z.string().email(),
        role: z.enum(["owner", "admin", "viewer"]).default("viewer"),
      })
    )
    .min(1),
  ttl_hours: z
    .number()
    .int()
    .min(1)
    .max(24 * 14)
    .optional(),
});

async function assertOwnerOrAdmin(userId: string, brandId: string) {
  const invitor = await Membership.findOne({
    brand_id: brandId,
    user_id: userId,
    status: "active",
  });
  return invitor;
}

function getVerificationToken(invite: IInvite, ttlHours: number): string {
  // Create hashed invite token
  const verificationToken = crypto.randomBytes(20).toString("hex");
  const expires_at = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  // Hash the token
  invite.verify_token = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");
  invite.verify_token_expire = expires_at;
  return verificationToken;
}

// list pending invites for UI
export async function GET(
  _req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  await connect();
  const { brandId } = await params;
  const invites = await Invite.find({
    brand_id: brandId,
    status: "pending",
    verify_token_expire: { $gt: new Date() }, // Only non-expired invites
  })
    .select("_id email role verify_token_expire invited_by createdAt")
    .lean();

  return new NextResponse(
    JSON.stringify({
      data: invites.map((i) => ({
        id: String(i._id),
        email: i.email,
        role: i.role,
        expires_at: i.verify_token_expire,
        invited_by: i.invited_by,
        created_at: i.createdAt,
      })),
    }),
    { status: 200 }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  // Parse and validate the request body
  const parse = MultiInviteBody.safeParse(await request.json());
  if (!parse.success) {
    return new NextResponse(
      JSON.stringify({
        message: "Invalid request body!",
        data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
      }),
      { status: 400 }
    );
  }

  // extract the brandId from params
  const { brandId } = await params;

  // verify brand exists
  const brand = await Brand.findById(brandId).lean();
  if (!brand) {
    return new NextResponse(
      JSON.stringify({ message: "Brand does not exist!" }),
      { status: 400 }
    );
  }

  const { user_id, emails } = parse.data;
  const ttlHours = parse.data.ttl_hours ?? 24 * 7; // 7 days

  // connect to the database
  await connect();

  // fetch the user details
  const user = await User.findById(user_id);
  if (!user) {
    return new NextResponse(
      JSON.stringify({ message: "User does not exist!" }),
      { status: 400 }
    );
  }

  // Authorization: inviter must be owner/admin on this brand
  const invitor = await assertOwnerOrAdmin(user._id, brandId);
  if (!invitor || !["owner", "admin"].includes(invitor.role)) {
    return new NextResponse(
      JSON.stringify({
        message: "You do not have permission to invite users to this brand.",
      }),
      { status: 403 }
    );
  }

  // Prepare results
  const results: Array<{ email: string; status: string; message: string }> = [];

  for (const emailRaw of emails) {
    const { email: enteredEmail, role: selectedRole } = emailRaw;
    const email = enteredEmail.toLowerCase().trim();

    // Skip empty emails
    if (!email) {
      results.push({
        email: enteredEmail,
        status: "error",
        message: "Email cannot be empty",
      });
      continue;
    }

    // Prevent self-invitation
    if (email === user.email.toLowerCase()) {
      results.push({
        email,
        status: "skipped",
        message: "You cannot invite yourself",
      });
      continue;
    }

    try {
      // check if this email is already registered with us
      const isUserRegisted = await User.findOne({ email }).lean();

      // If the email already has an active membership on this brand, skip
      let existingMember = null;
      if (isUserRegisted && (isUserRegisted as any)._id) {
        existingMember = await Membership.findOne({
          brand_id: brandId,
          user_id: (isUserRegisted as any)._id,
          status: "active",
        }).lean();
      }

      if (existingMember) {
        results.push({
          email,
          status: "skipped",
          message: "User is already a member of this brand",
        });
        continue;
      }

      // Prevent duplicate pending invites to same brand/email
      // Also check if invite is not expired
      const existingInvite = await Invite.findOne({
        brand_id: brandId,
        email,
        status: "pending",
        verify_token_expire: { $gt: new Date() }, // Only consider non-expired invites
      }).lean();

      if (existingInvite) {
        results.push({
          email,
          status: "skipped",
          message: "An active invite is already pending for this email",
        });
        continue;
      }

      // Persist invite
      const newInvite = new Invite({
        brand_id: brandId,
        email,
        role: selectedRole,
        invited_by: user._id,
        status: "pending",
      });

      // Email the invite link
      const verificationToken = getVerificationToken(newInvite, ttlHours);
      await newInvite.save();
      let verificationLink = "";

      if (isUserRegisted && (isUserRegisted as any)._id) {
        verificationLink = `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/accept-invite/${brandId}?verifyToken=${verificationToken}&email=${email}&user_id=${
          (isUserRegisted as any)._id
        }`;
      } else {
        verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/accept-invite/${brandId}?verifyToken=${verificationToken}&email=${email}`;
      }
      const message = inviteMemberEmailTemplate(verificationLink);

      // Send verification email
      try {
        await sendEmail(email, "Brand Invitation Email", message);
        results.push({
          email,
          status: "invited",
          message: "Invitation email has been sent!",
        });
      } catch (emailErr) {
        console.error("Failed to send invitation email:", emailErr);
        results.push({
          email,
          status: "error",
          message: "Failed to send invitation email.",
        });
      }
    } catch (err) {
      console.error("Error processing invitation for", email, ":", err);
      results.push({
        email,
        status: "error",
        message: "An error occurred while processing this invitation.",
      });
    }
  }

  return new NextResponse(
    JSON.stringify({
      data: results,
    }),
    {
      status: 201,
    }
  );
}
