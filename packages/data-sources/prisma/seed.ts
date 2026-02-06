import {
  createPrismaAdapter,
  PrismaClient,
} from "@oxford-heavy/data-sources-prisma";

// createPrismaAdapter() resolves DATABASE_URL automatically
const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main() {
  console.log("Seeding database...");
  const existingMessage = await prisma.helloWorldMessage.findFirst();
  if (!existingMessage) {
    await prisma.helloWorldMessage.create({
      data: {
        message: "Hello from the database!",
      },
    });
    console.log("Database seeded successfully.");
  } else {
    console.log("Database has already been seeded.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
