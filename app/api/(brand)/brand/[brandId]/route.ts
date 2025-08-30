import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Plan from "@/lib/models/plan";
import Brand from "@/lib/models/brand";

type Params = Promise<{ brandId: string }>;

// get brand details api
export const GET = async (request: Request, context: { params: Params }) => {
  try {
    const { brandId } = await context.params;

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

    return new NextResponse(
      JSON.stringify({
        message: "Brand Details fetched successfully!",
        data: brand,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new NextResponse("Error in fetching brand " + err, {
      status: 500,
    });
  }
};
