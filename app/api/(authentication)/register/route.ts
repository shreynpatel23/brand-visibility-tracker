import { NextResponse } from "next/server";
import crypto from "crypto";
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connect from "@/lib/db";
import User from "@/lib/models/user";
import { cookies } from "next/headers";
import { sendEmail } from "@/utils/sendEmail";
import { IUser } from "@/context/userContext";
import Plan from "@/lib/models/plan";
import { verificationEmailTemplate } from "@/utils/verificationEmailTempelate";
import { Types } from "mongoose";
import { PlanTypes } from "@/constants/plan-types";
import { VERIFY_EMAIL } from "@/constants/onboarding-constants";

function getVerificationToken(user: IUser): string {
  // Generate the token
  const verificationToken = crypto.randomBytes(20).toString("hex");

  // Hash the token
  user.verify_token = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  user.verify_token_expire = new Date(Date.now() + 30 * 60 * 1000);
  return verificationToken;
}

export const POST = async (request: Request) => {
  try {
    const { full_name, email, password } = await request.json();

    // encrypt the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    // establish the connection with database
    await connect();

    // check if the user is already present or not
    const user = await User.findOne({ email });
    if (user) {
      return new NextResponse(
        JSON.stringify({
          message: "User already present with this email. Please try Login!",
        }),
        { status: 400 }
      );
    }

    // fetch all plans
    const plans = await Plan.find();

    const freePlan: any = plans.filter(
      (plan) => plan.plan_id === PlanTypes.STARTER.toLowerCase()
    );

    // create the new user object
    const newUser = new User({
      full_name,
      email,
      password: hashedPassword,
      number_of_retries: 0,
      plan_id: new Types.ObjectId(freePlan?.[0]?._id),
      current_onboarding_step: VERIFY_EMAIL,
    });

    // generate a verification token for the user and save it in the database
    const verificationToken = getVerificationToken(newUser);
    await newUser.save();

    const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/verify-email?verifyToken=${verificationToken}&id=${newUser?._id}`;
    const message = verificationEmailTemplate(verificationLink);
    // Send verification email
    await sendEmail(newUser?.email, "Email Verification", message);

    // create a jwt token and send it as a resppnse
    const token = jwt.sign({ newUser }, process.env.TOKEN_SECRET || "sign");

    const response = { ...newUser?._doc, token };

    (await cookies()).set({
      name: "userData",
      value: JSON.stringify(response),
      httpOnly: true,
      path: "/",
    });

    return new NextResponse(
      JSON.stringify({
        message: "User created successfully!",
        data: { user: response },
      }),
      {
        status: 201,
      }
    );
  } catch (err) {
    return new NextResponse("Error in creating users " + err, { status: 500 });
  }
};
