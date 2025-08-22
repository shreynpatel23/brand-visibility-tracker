import { NextResponse } from "next/server";
import crypto from "crypto";
import * as bcrypt from "bcryptjs";
import connect from "@/lib/db";
import User from "@/lib/models/user";

export async function POST(req: Request) {
  try {
    const { token, id, newPassword } = await req.json();
    await connect();

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      _id: id,
      reset_password_token: hashedToken,
      reset_password_expire: { $gt: new Date() },
    });

    if (!user) {
      return new NextResponse(
        JSON.stringify({
          message: "User not found or token is invalid/expired.",
        }),
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.reset_password_token = undefined;
    user.reset_password_expire = undefined;
    await user.save();

    return new NextResponse(
      JSON.stringify({
        message: "Password reset successfully! Redirecting to login...",
      }),
      {
        status: 201,
      }
    );
  } catch (err) {
    return new NextResponse("Error in sending email " + err, { status: 500 });
  }
}
