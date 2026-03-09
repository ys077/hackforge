"use strict";

const { sequelize } = require("../src/models");

const resetDatabase = async () => {
  const readline = require("readline");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "⚠️  This will DROP ALL TABLES. Are you sure? (yes/no): ",
      async (answer) => {
        rl.close();

        if (answer.toLowerCase() !== "yes") {
          console.log("❌ Database reset cancelled\n");
          process.exit(0);
        }

        try {
          console.log("\n🔄 Resetting database...\n");

          // Drop all tables
          await sequelize.drop();
          console.log("✅ All tables dropped\n");

          // Recreate tables
          await sequelize.sync({ force: true });
          console.log("✅ All tables recreated\n");

          console.log("🎉 Database reset completed!\n");
          console.log("💡 Run `npm run seed` to populate with initial data\n");

          process.exit(0);
        } catch (error) {
          console.error("❌ Reset error:", error);
          process.exit(1);
        }
      },
    );
  });
};

// Run reset
resetDatabase();
