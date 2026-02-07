const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const creatorId = "5815f86b-6fbf-4089-938c-4c1c68d2edea";
    const streams = await prisma.stream.findMany({
        where: {
            userId: creatorId
        }
    });
    console.log("Streams for creator:", JSON.stringify(streams, null, 2));
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
