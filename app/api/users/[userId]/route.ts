import { NextResponse } from "next/server";
import connect from "@/lib/db";
import User from "@/lib/models/user";
import { Types } from "mongoose";

type Params = Promise<{ userId: string }>;

// get user details api
export const GET = async (request: Request, context: { params: Params }) => {
  try {
    const { userId } = await context.params;

    // check if the userId exist and is valid
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing userId!" }),
        { status: 400 }
      );
    }

    // establish the database connection
    await connect();

    // get user details from userID
    let user = await User.findById(userId);

    if (!user) {
      return new NextResponse(
        JSON.stringify({
          message: "User does not exist!",
        }),
        { status: 400 }
      );
    }

    return new NextResponse(
      JSON.stringify({
        message: "User Details fetched successfully!",
        data: user,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new NextResponse("Error in fetching user " + err, { status: 500 });
  }
};

// update user api
export const PUT = async (request: Request, context: { params: Params }) => {
  try {
    const { userId } = await context.params;
    // extract the fields from the request object
    const { data } = await request.json();

    // establish the connection with database
    await connect();

    // check if the userId is valid
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing userId!" }),
        { status: 400 }
      );
    }

    // check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: "User does not exist!" }),
        { status: 400 }
      );
    }

    // update the user
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      {
        ...data,
      },
      {
        new: true,
      }
    );

    // check if the process successed
    if (!updatedUser) {
      return new NextResponse(
        JSON.stringify({ message: "User not updated!" }),
        { status: 400 }
      );
    }

    return new NextResponse(
      JSON.stringify({
        message: "User updated successfully!",
        data: updatedUser,
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    return new NextResponse("Error in updating user " + err, {
      status: 500,
    });
  }
};
