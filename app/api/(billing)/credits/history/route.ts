import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { CreditService } from "@/lib/services/creditService";
import connect from "@/lib/db";
import { Types } from "mongoose";

const HistoryQuerySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const parse = HistoryQuerySchema.safeParse(queryParams);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid query parameters!",
          errors: parse.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }),
        { status: 400 }
      );
    }

    const { userId, page, limit, type, startDate, endDate } = parse.data;

    // Validate userId
    if (!Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid userId format!" }),
        { status: 400 }
      );
    }

    await connect();

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter options
    const filterOptions = {
      type,
      startDate,
      endDate,
    };

    // Get transactions with pagination and total count
    const [transactions, totalCount] = await Promise.all([
      CreditService.getCreditHistory(userId, limitNum, skip, filterOptions),
      CreditService.getCreditHistoryCount(userId, filterOptions),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasMore = pageNum < totalPages;
    const hasPrevious = pageNum > 1;

    const response = {
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasMore,
        hasPrevious,
      },
      summary: {
        totalTransactions: totalCount,
        currentPage: pageNum,
        totalPages,
        showingFrom: skip + 1,
        showingTo: Math.min(skip + limitNum, totalCount),
      },
    };

    return new NextResponse(
      JSON.stringify({
        message: "Transaction history fetched successfully!",
        data: response,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Get credit history API error:", error);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching credit history",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
