import { NextResponse } from "next/server";
import connect from "@/lib/db";
import Plan from "@/lib/models/plan";
import { Types } from "mongoose";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";

export const GET = async () => {
  try {
    // establish a connection with database
    await connect();

    // extract all the available plans
    const plans = await Plan.find().sort({ createdAt: 1 });

    // send them to the frontend
    return new NextResponse(
      JSON.stringify({ message: "plans fetched successfully!", data: plans }),
      { status: 200 }
    );
  } catch (err) {
    return new NextResponse("Error in fetching plans " + err, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }
    const {
      planId,
      name,
      description,
      price,
      max_brands,
      ai_models_supported,
      features,
    } = await request.json();

    // establish the connection with database
    await connect();

    // create the new plan object
    const newPlan = new Plan({
      plan_id: planId,
      name,
      description,
      price,
      max_brands,
      ai_models_supported,
      features: features || [],
    });
    // save the info in the dabatabse
    await newPlan.save();

    // send the confirmation to frontend
    return new NextResponse(
      JSON.stringify({ message: "Plan created successfully!", data: newPlan }),
      {
        status: 201,
      }
    );
  } catch (err) {
    return new NextResponse("Error in creating plan " + err, { status: 500 });
  }
};

export const PUT = async (request: Request) => {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }
    // extract the fields from the request object
    const { _id, data } = await request.json();

    // check if the planId exist and is valid
    if (!_id || !Types.ObjectId.isValid(_id)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing planId!" }),
        { status: 400 }
      );
    }

    // establish the connection with database
    await connect();

    // check if the store exists in the database
    const plan = await Plan.findById(_id);
    if (!plan) {
      return new NextResponse(
        JSON.stringify({ message: "Plan does not exist!" }),
        { status: 400 }
      );
    }

    // update the plan
    const updatedPlan = await Plan.findOneAndUpdate(
      { _id: plan._id },
      {
        ...data,
      },
      {
        new: true,
      }
    );

    // check if the process successed
    if (!updatedPlan) {
      return new NextResponse(
        JSON.stringify({ message: "Plan not updated!" }),
        { status: 400 }
      );
    }

    return new NextResponse(
      JSON.stringify({
        message: "Plan updated successfully!",
        data: updatedPlan,
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    return new NextResponse("Error in updating plan " + err, {
      status: 500,
    });
  }
};
