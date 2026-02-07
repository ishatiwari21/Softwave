import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/app/lib/db";
import { z } from "zod";
import { YT_REGEX } from "@/app/lib/utils";
import { authOptions } from "@/app/lib/auth";
import { getServerSession } from "next-auth";

const CreateStreamSchema = z.object({
    creatorId: z.string().optional(),
    url: z.string()
})

const MAX_QUEUE_LEN = 20;

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({
                message: "Unauthenticated"
            }, { status: 403 })
        }

        const user = await prismaClient.user.findFirst({
            where: {
                email: session?.user?.email ?? ""
            }
        });

        if (!user) {
            return NextResponse.json({
                message: "Unauthenticated"
            }, { status: 403 })
        }

        const data = CreateStreamSchema.parse(await req.json());
        const isYt = data.url.match(YT_REGEX);
        if (!isYt) {
            return NextResponse.json({
                message: "wrong URL format"
            }, {
                status: 411
            })
        }

        const match = data.url.match(YT_REGEX);
        const extractedId = match ? match[1] : null;

        if (!extractedId) {
            return NextResponse.json({
                message: "could not extract video ID"
            }, {
                status: 411
            });
        }

        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${extractedId}`);
        const metadata = await res.json();

        const [existingActiveStream, streamsCount] = await Promise.all([
            prismaClient.stream.count({
                where: {
                    userId: data.creatorId ?? user.id,
                    url: data.url,
                    played: false
                }
            }),
            prismaClient.stream.count({
                where: {
                    userId: data.creatorId ?? user.id,
                    played: false
                }
            })
        ]);

        if (streamsCount >= MAX_QUEUE_LEN) {
            return NextResponse.json({
                message: "Already at limit"
            }, {
                status: 400
            })
        }

        if (existingActiveStream) {
            return NextResponse.json({
                message: "Stream already exists in queue"
            }, {
                status: 400
            })
        }

        const stream = await prismaClient.stream.create({
            data: {
                userId: data.creatorId ?? user.id,
                addedById: user.id,
                url: data.url,
                extractedId: extractedId,
                type: "Youtube",
                title: metadata.title ?? "Can't find video",
                smallImg: `https://i.ytimg.com/vi/${extractedId}/hqdefault.jpg`,
                bigImg: `https://i.ytimg.com/vi/${extractedId}/maxresdefault.jpg`
            }
        });

        return NextResponse.json({
            ...stream,
            hasUpvoted: false,
            upvotes: 0
        });

    } catch (e: unknown) {
        console.error("Error creating stream:", e);
        if (typeof e === "object" && e !== null && "code" in e && e.code === "P2003") {
            return NextResponse.json({
                message: "User with the provided creatorId does not exist"
            }, {
                status: 404
            });
        }
        return NextResponse.json({
            message: "Error while adding stream",
            error: e instanceof Error ? e.message : String(e),
            stack: e instanceof Error ? e.stack : undefined
        }, {
            status: 400 // Use 400 for errors
        })
    }

}

export async function GET(req: NextRequest) {
    const creatorId = req.nextUrl.searchParams.get("creatorId");
    const session = await getServerSession(authOptions);

    const user = await prismaClient.user.findFirst({
        where: {
            email: session?.user?.email ?? ""
        }
    });
    if (!user) {
        return NextResponse.json({
            message: "Unauthenticated"
        }, { status: 403 })
    }
    if (!creatorId) {
        return NextResponse.json({
            message: "error"
        }, { status: 411 })
    }
    const [streams, activeStream] = await Promise.all([await prismaClient.stream.findMany({
        where: {
            userId: creatorId,
            played: false
        },
        include: {
            _count: {
                select: {
                    upvotes: true
                }
            },
            upvotes: {
                where: {
                    userId: user.id
                }
            }
        }
    }), prismaClient.currentStream.findFirst({
        where: {
            userId: creatorId
        },
        include: {
            stream: true
        }
    })])
    return NextResponse.json({
        streams: streams.map(({ _count, ...rest }) => ({
            ...rest,
            upvotes: _count.upvotes,
            haveUpvoted: rest.upvotes.length > 0
        })).filter((s: any) => s.id !== activeStream?.streamId),
        activeStream
    })

}
