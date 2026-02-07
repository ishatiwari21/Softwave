import "dotenv/config";
import { prismaClient } from "./app/lib/db";

async function main() {
    const users = await prismaClient.user.findMany();
    console.log("Users:", JSON.stringify(users, null, 2));
}

main();
