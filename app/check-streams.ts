import "dotenv/config";
import { prismaClient } from "./app/lib/db";

async function main() {
    const streams = await prismaClient.stream.findMany();
    console.log("Streams count:", streams.length);
    console.log("Streams:", JSON.stringify(streams, null, 2));
}

main();
