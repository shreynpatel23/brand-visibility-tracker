import { NextResponse } from "next/server";
import connect from "@/lib/db";
import User from "@/lib/models/user";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import { Membership } from "@/lib/models/membership";
import { RouteParams, UserParams } from "@/types/api";

// get user role api
export const GET = async (
  request: Request,
  context: { params: RouteParams<UserParams> }
) => {
  try {
    const { userId } = await context.params;
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");

    // check if the userId exist and is valid
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid or missing userId!",
        }),
        { status: 400 }
      );
    }

    // check if the brandId exist and is valid
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid or missing brandId!",
        }),
        { status: 400 }
      );
    }

    // establish the database connection
    await connect();

    // get user details from userID
    const user = await User.findById(userId);

    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: "User does not exist!" }),
        { status: 404 }
      );
    }

    // check if the brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return new NextResponse(
        JSON.stringify({ message: "Brand does not exist!" }),
        { status: 404 }
      );
    }

    // fetch the membership for the user and brand
    const membership = await Membership.findOne({
      brand_id: brandId,
      user_id: userId,
      status: "active",
    });
    if (!membership) {
      return new NextResponse(
        JSON.stringify({ message: "Membership does not exist!" }),
        { status: 404 }
      );
    }

    // return the user role
    return new NextResponse(
      JSON.stringify({
        message: "User role fetched successfully!",
        data: {
          role: membership.role,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error in fetching user role!" }),
      { status: 500 }
    );
  }
};
