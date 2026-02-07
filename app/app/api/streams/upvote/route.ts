import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/app/lib/db";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

const UpvoteSchema = z.object({
    streamId: z.string(),
});

export async function POST(req: NextRequest) {

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return NextResponse.json({
            message: "Unauthenticated"
        }, { status: 403 })
    }

    const user = await prismaClient.user.findFirst({
        where: {
            email: session.user.email
        }
    })
    if (!user) {
        return NextResponse.json({
            message: "Unauthenticated"
        }, { status: 404 })
    }
    try {
        const data = UpvoteSchema.parse(await req.json());
        await prismaClient.upvote.create({
            data: {
                userId: user.id,
                streamId: data.streamId,
            },
        });
        return NextResponse.json({
            message: "Upvoted successfully",
        });
    } catch {
        return NextResponse.json(
            {
                message: "Error while upvoting",
            },
            {
                status: 403,
            }
        );
    }
}
