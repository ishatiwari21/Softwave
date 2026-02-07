import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";


import { authOptions } from "@/app/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);


    const user = await prismaClient.user.findFirst({
        where: {
            email: session?.user?.email ?? ""
        }
    })

    if (!user) {
        return NextResponse.json({
            message: "Unauthenticated"
        }, { status: 403 })
    }

    const mostUpvotedStream = await prismaClient.stream.findFirst({
        where: {
            userId: user.id,
            played: false
        },
        orderBy: {
            upvotes: {
                _count: "desc"
            }
        }
    });

    if (!mostUpvotedStream) {
        return NextResponse.json({
            message: "No songs in queue",
            stream: null
        })
    }

    await Promise.all([prismaClient.currentStream.upsert({
        where: {
            userId: user.id
        },
        update: {
            streamId: mostUpvotedStream.id
        },
        create: {
            userId: user.id,
            streamId: mostUpvotedStream.id
        }
    }), prismaClient.stream.update({
        where: {
            id: mostUpvotedStream.id
        },
        data: {
            played: true,
            playedTs: new Date()
        }
    })])

    return NextResponse.json({
        stream: mostUpvotedStream
    })

}