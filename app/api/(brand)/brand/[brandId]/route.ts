import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Plan from "@/lib/models/plan";
import Brand from "@/lib/models/brand";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";

type Params = Promise<{ brandId: string }>;

// get brand details api
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
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    // check if the brandId exist and is valid
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    // establish the database connection
    await connect();

    // load all plans
    await Plan.find({});

    // get business details from brandId
    const brand = await Brand.findById(brandId).populate({
      path: "ownerId",
      select: ["_id", "full_name", "email"],
    });

    if (!brand) {
      return new NextResponse(
        JSON.stringify({
          message: "Brand does not exist!",
        }),
        { status: 400 }
      );
    }

    // If email is provided, fetch the invite details to get the invited_by user
    let invitedByUser = null;
    if (email) {
      const { Invite } = await import("@/lib/models/invite");

      const invite = await Invite.findOne({
        brand_id: brandId,
        email: email.toLowerCase(),
        status: "pending",
      }).populate({
        path: "invited_by",
        select: ["_id", "full_name", "email"],
      });

      if (invite && invite.invited_by) {
        invitedByUser = invite.invited_by;
      }
    }

    const responseData = {
      ...brand.toObject(),
      invitedBy: invitedByUser || brand.ownerId, // Use invited_by if available, fallback to owner
    };

    return new NextResponse(
      JSON.stringify({
        message: "Brand Details fetched successfully!",
        data: responseData,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new NextResponse("Error in fetching brand " + err, {
      status: 500,
    });
  }
};
