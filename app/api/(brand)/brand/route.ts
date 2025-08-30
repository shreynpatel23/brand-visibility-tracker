import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connect from "@/lib/db";
import User from "@/lib/models/user";
import Plan from "@/lib/models/plan";
import Brand from "@/lib/models/brand";
import { Membership } from "@/lib/models/membership";
import { ObjectIdString, RoleSchema, StatusSchema } from "@/utils/mongoose";
import { BrandSummary } from "../../(authentication)/login/route";

const GetAllBrandsOfUser = z.object({
  user_id: ObjectIdString,
});

const CreateBrandBody = z.object({
  user_id: ObjectIdString,
  name: z.string().min(2),
  category: z.string().optional(),
  region: z.string().optional(),
  use_case: z.string().optional(),
  target_audience: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  feature_list: z.array(z.string()).optional(),
});

const MembershipInput = z.object({
  brand_id: ObjectIdString,
  user_id: ObjectIdString,
  role: RoleSchema,
  status: StatusSchema,
  created_by: ObjectIdString.optional(),
});

// get api to get all the brands of the user owned or as a member
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  // Zod validation for user_id
  const parse = GetAllBrandsOfUser.safeParse({ user_id: userId });
  if (!parse.success) {
    return new NextResponse(
      JSON.stringify({
        message: "Invalid user_id!",
        data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
      }),
      { status: 400 }
    );
  }

  // fetch the user details
  const user = await User.findById(userId);
  if (!user) {
    return new NextResponse(
      JSON.stringify({ message: "User does not exist!" }),
      { status: 400 }
    );
  }

  const ownedBrands = await Brand.find({
    ownerId: user._id,
    deletedAt: null,
  }).select(
    "_id name category region target_audience competitors use_case feature_list createdAt updatedAt"
  );

  const ownedSummaries: BrandSummary[] = ownedBrands.map((b: BrandSummary) => ({
    ...b,
    _id: String(b._id),
    role: "owner",
  }));

  const memberships = await Membership.find({
    user_id: user._id,
    status: "active",
  })
    .select("brand_id role")
    .lean();

  const memberBrandIds = memberships.map((m) => m.brand_id);
  const memberBrands = memberBrandIds.length
    ? await Brand.find({
        _id: { $in: memberBrandIds },
        deletedAt: null,
      })
        .select(
          "_id name category region target_audience competitors use_case feature_list createdAt updatedAt"
        )
        .lean()
    : [];

  // Attach role from membership (not owner)
  const roleByBrandId = new Map<string, "admin" | "viewer" | "owner">();
  memberships.forEach((m) => roleByBrandId.set(String(m.brand_id), m.role));

  const memberSummaries: BrandSummary[] = memberBrands.map((b) => ({
    ...b,
    _id: String(b._id),
    role: (roleByBrandId.get(String(b._id)) as "admin" | "viewer") ?? "viewer",
  }));

  // (3) Merge + dedupe (prefer owner role when both)
  const mergedById = new Map<string, BrandSummary>();
  for (const b of [...memberSummaries, ...ownedSummaries]) {
    const key = b._id;
    if (!mergedById.has(key)) mergedById.set(key, b);
    else {
      // if both exist, ensure "owner" wins
      const prev = mergedById.get(key)!;
      if (b.role === "owner" && prev.role !== "owner") mergedById.set(key, b);
    }
  }

  const brands = Array.from(mergedById.values());
  return new NextResponse(
    JSON.stringify({
      message: "fetched all brands of the user successfully!",
      data: {
        brands,
      },
    }),
    {
      status: 200,
    }
  );
}

export async function POST(request: NextRequest) {
  // Parse and validate the request body
  const parse = CreateBrandBody.safeParse(await request.json());
  if (!parse.success) {
    return new NextResponse(
      JSON.stringify({
        message: "Invalid request body!",
        data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
      }),
      { status: 400 }
    );
  }

  // extract the request data
  const {
    user_id,
    name,
    category,
    region,
    use_case,
    target_audience,
    competitors,
    feature_list,
  } = parse.data;

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

  // fetch all plans
  const plans = await Plan.find();
  // TODO: all a plan check later such that only paid users can create brands
  // TODO: checks if the user is allowed to create a brand based on their plan

  // create the brand
  const newBrand = new Brand({
    ownerId: user._id,
    name,
    category,
    region,
    use_case,
    target_audience,
    competitors,
    feature_list,
  });

  // Build membership payload
  const membershipPayload = {
    brand_id: newBrand._id.toString(),
    user_id: user._id.toString(),
    role: "owner" as const,
    status: "active" as const,
    created_by: user._id.toString(),
  };

  // Validate membership with Zod (this is the bit you asked about)
  const membershipParsed = MembershipInput.safeParse(membershipPayload);
  if (!membershipParsed.success) {
    return new NextResponse(
      JSON.stringify({
        message: "Invalid request body!",
        data: `${membershipParsed.error.issues[0]?.path} - ${membershipParsed.error.issues[0]?.message}`,
      }),
      { status: 400 }
    );
  }

  // update the users table with the new business id
  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id },
    {
      current_onboarding_step: null,
    },
    {
      new: true,
    }
  );

  // check if the process successed
  if (!updatedUser) {
    return new NextResponse(JSON.stringify({ message: "User not updated!" }), {
      status: 400,
    });
  }

  // Create and save the brand and  membership
  await newBrand.save();
  await new Membership(membershipParsed.data).save();

  return new NextResponse(
    JSON.stringify({
      message: "Brand created successfully!",
      data: { brand: newBrand },
    }),
    {
      status: 201,
    }
  );
}
