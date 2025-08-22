import connect from "@/lib/db";
import crypto from "crypto";
import User from "@/lib/models/user";
import { NextResponse } from "next/server";
import { verificationEmailTemplate } from "@/utils/verificationEmailTempelate";
import { sendEmail } from "@/utils/sendEmail";
import { IUser } from "@/context/userContext";

function getVerificationToken(user: IUser): string {
  // Generate the token
  const verificationToken = crypto.randomBytes(20).toString("hex");

  // Hash the token
  user.verify_token = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  user.verify_token_expire = new Date(Date.now() + 30 * 60 * 1000);
  const numberOfRetries = user?.number_of_retries || 0;
  user.number_of_retries = numberOfRetries + 1;
  return verificationToken;
}

export const POST = async (request: Request) => {
  try {
    const { userId } = await request.json();

    // establish the connection with database
    await connect();

    // check if the user is already present or not
    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: "User does not exist!" }),
        { status: 400 }
      );
    }

    if (user.number_of_retries >= 5) {
      return new NextResponse(
        JSON.stringify({
          message:
            "You have maxed out the attemps to verify your email. Please write us an email at brandvis.io and we will get back to you!",
        }),
        { status: 400 }
      );
    }

    // generate a verification token for the user and save it in the database
    const verificationToken = getVerificationToken(user);
    await user.save();

    const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/verify-email?verifyToken=${verificationToken}&id=${user?._id}`;
    const message = verificationEmailTemplate(verificationLink);
    // Send verification email
    await sendEmail(user?.email, "Email Verification", message);

    return new NextResponse(
      JSON.stringify({ message: "Email sent successfully!", data: user }),
      {
        status: 200,
      }
    );
  } catch (err) {
    return new NextResponse("Error in sending email " + err, { status: 500 });
  }
};
