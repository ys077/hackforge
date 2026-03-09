"use strict";

const { sequelize } = require("../src/models");

const migrate = async () => {
  try {
    console.log("🔄 Running database migrations...\n");

    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Sync all models
    // Use { force: true } to drop and recreate tables (DESTRUCTIVE!)
    // Use { alter: true } to alter existing tables to match models
    await sequelize.sync({ alter: true });

    console.log("✅ All models synchronized successfully\n");
    console.log("🎉 Migration completed!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
};

// Run migration
migrate();
