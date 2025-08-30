import { NextResponse } from "next/server";
import crypto from "crypto";
import connect from "@/lib/db";
import User, { IUser } from "@/lib/models/user";
import { resetPasswordEmailTemplate } from "@/utils/resetPasswordEmailTempelate";
import { sendEmail } from "@/utils/sendEmail";

function getVerificationToken(user: IUser): string {
  // Generate the token
  const verificationToken = crypto.randomBytes(20).toString("hex");

  // Hash the token
  user.reset_password_token = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  user.reset_password_expire = new Date(Date.now() + 30 * 60 * 1000);
  return verificationToken;
}

export const POST = async (request: Request) => {
  try {
    const { email } = await request.json();

    // establish the connection with database
    await connect();

    // check if the user is already present or not
    const user = await User.findOne({ email });
    if (!user) {
      return new NextResponse(
        JSON.stringify({
          message: "User not found with this email. Please Sign Up!",
        }),
        { status: 400 }
      );
    }

    // generate a verification token for the user and save it in the database
    const verificationToken = getVerificationToken(user);
    await user.save();
    const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${verificationToken}&id=${user?._id}`;
    const message = resetPasswordEmailTemplate(verificationLink);

    // Send verification email
    await sendEmail(user?.email, "Reset Your Password", message);

    return new NextResponse(
      JSON.stringify({
        message: "Reset email sent!",
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    return new NextResponse("Error in sending email " + err, { status: 500 });
  }
};
