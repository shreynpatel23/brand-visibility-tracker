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
// export async function GET(
//   _req: NextRequest,
//   { params }: { params: { brandId: string } }
// ) {
//   await connect();
//   const brandId = params.brandId;
//   const invites = await Invite.find({
//     brand_id: brandId,
//     status: "pending",
//     expires_at: { $gt: new Date() },
//   })
//     .select("_id email role expires_at invited_by createdAt")
//     .lean();

//   return NextResponse.json({
//     data: invites.map((i) => ({
//       id: String(i._id),
//       email: i.email,
//       role: i.role,
//       expires_at: i.expires_at,
//       invited_by: i.invited_by,
//       created_at: i.createdAt,
//     })),
//   });
// }

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
    const email = enteredEmail.toLowerCase();

    // check if this email is already registered with us
    const isUserRegisted = await User.findOne({ email });

    // If the email already has an active membership on this brand, skip
    const existingMember = await Membership.findOne({ brand_id: brandId })
      .populate({ path: "user_id", select: "email" })
      .lean();

    if (
      existingMember &&
      (existingMember as any)?.user_id?.email?.toLowerCase?.() === email
    ) {
      results.push({
        email,
        status: "skipped",
        message: "User is already a member of this brand",
      });
      continue;
    }

    // Prevent duplicate pending invites to same brand/email
    const existingInvite = await Invite.findOne({
      brand_id: brandId,
      email,
      status: "pending",
    }).lean();

    if (existingInvite) {
      results.push({
        email,
        status: "skipped",
        message: "An invite is already pending for this email",
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
    const verificationToken = await getVerificationToken(newInvite, ttlHours);
    await newInvite.save();
    let verificationLink = "";

    if (isUserRegisted._id) {
      verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/${user._id}/brands/${brandId}/accept-invite?verifyToken=${verificationToken}&email=${email}&user_id=${isUserRegisted._id}`;
    } else {
      verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/${user._id}/brands/${brandId}/accept-invite?verifyToken=${verificationToken}&email=${email}`;
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
    } catch (err) {
      results.push({
        email,
        status: "error",
        message: "Failed to send invitation email.",
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
