"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const {
  connectDatabase,
  User,
  Skill,
  GovernmentScheme,
} = require("../src/models");
const bcrypt = require("bcryptjs");

const seedData = async () => {
  try {
    console.log("🌱 Starting database seeding...\n");

    // Connect to MongoDB
    await connectDatabase();
    console.log("✅ Connected to MongoDB\n");

    // Seed Skills
    console.log("📋 Seeding skills...");
    const skills = [
      // Construction & Labor
      { name: "Masonry", category: "construction" },
      { name: "Carpentry", category: "construction" },
      { name: "Plumbing", category: "construction" },
      { name: "Electrical Work", category: "construction" },
      { name: "Painting", category: "construction" },
      { name: "Welding", category: "construction" },
      { name: "Tile Setting", category: "construction" },
      { name: "Roofing", category: "construction" },

      // Domestic Work
      { name: "Housekeeping", category: "domestic" },
      { name: "Cooking", category: "domestic" },
      { name: "Child Care", category: "domestic" },
      { name: "Elder Care", category: "domestic" },
      { name: "Gardening", category: "domestic" },
      { name: "Driving", category: "domestic" },

      // Manufacturing & Industrial
      { name: "Machine Operation", category: "manufacturing" },
      { name: "Assembly Line Work", category: "manufacturing" },
      { name: "Quality Inspection", category: "manufacturing" },
      { name: "Packaging", category: "manufacturing" },
      { name: "Forklift Operation", category: "manufacturing" },

      // Services
      { name: "Security Guard", category: "services" },
      { name: "Delivery", category: "services" },
      { name: "Cleaning Services", category: "services" },
      { name: "Tailoring", category: "services" },
      { name: "Beauty Services", category: "services" },
      { name: "Retail Sales", category: "services" },

      // Agriculture
      { name: "Farming", category: "agriculture" },
      { name: "Harvesting", category: "agriculture" },
      { name: "Dairy Farming", category: "agriculture" },
      { name: "Livestock Care", category: "agriculture" },

      // Technical
      { name: "Mobile Repair", category: "technical" },
      { name: "Computer Basics", category: "technical" },
      { name: "AC Repair", category: "technical" },
      { name: "Appliance Repair", category: "technical" },
    ];

    for (const skill of skills) {
      await Skill.findOneAndUpdate({ name: skill.name }, skill, {
        upsert: true,
        new: true,
      });
    }
    console.log(`✅ Seeded ${skills.length} skills\n`);

    // Seed Government Schemes
    console.log("📋 Seeding government schemes...");
    const schemes = [
      {
        name: "Pradhan Mantri Shram Yogi Maan-dhan (PM-SYM)",
        description:
          "A pension scheme for unorganized sector workers aged 18-40 years with monthly income below Rs. 15,000.",
        schemeType: "central",
        benefitType: "financial",
        benefitAmountMax: 3000,
        minAge: 18,
        maxAge: 40,
        genderEligibility: "all",
        requiredDocuments: ["aadhaar"],
        eligibilityRules: {
          monthlyIncomeMax: 15000,
          sector: "unorganized",
        },
        isActive: true,
      },
      {
        name: "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)",
        description:
          "Life insurance scheme providing Rs. 2 lakh coverage for Rs. 436 annual premium.",
        schemeType: "central",
        benefitType: "insurance",
        benefitAmountMax: 200000,
        minAge: 18,
        maxAge: 50,
        genderEligibility: "all",
        requiredDocuments: ["aadhaar"],
        eligibilityRules: {},
        isActive: true,
      },
      {
        name: "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
        description:
          "Accident insurance scheme providing Rs. 2 lakh coverage for Rs. 20 annual premium.",
        schemeType: "central",
        benefitType: "insurance",
        benefitAmountMax: 200000,
        minAge: 18,
        maxAge: 70,
        genderEligibility: "all",
        requiredDocuments: ["aadhaar"],
        eligibilityRules: {},
        isActive: true,
      },
      {
        name: "E-Shram Card Registration",
        description:
          "National database for unorganized workers providing access to various welfare schemes.",
        schemeType: "central",
        benefitType: "other",
        minAge: 16,
        maxAge: 59,
        genderEligibility: "all",
        requiredDocuments: ["aadhaar"],
        eligibilityRules: {
          sector: "unorganized",
        },
        isActive: true,
      },
      {
        name: "National Pension System (NPS) - Workers",
        description:
          "Voluntary pension scheme for workers in the unorganized sector.",
        schemeType: "central",
        benefitType: "financial",
        minAge: 18,
        maxAge: 70,
        genderEligibility: "all",
        requiredDocuments: ["aadhaar", "pan"],
        eligibilityRules: {},
        isActive: true,
      },
      {
        name: "Ayushman Bharat - PM Jan Arogya Yojana",
        description:
          "Health insurance coverage of Rs. 5 lakh per family for secondary and tertiary care.",
        schemeType: "central",
        benefitType: "insurance",
        benefitAmountMax: 500000,
        genderEligibility: "all",
        requiredDocuments: ["aadhaar"],
        eligibilityRules: {
          incomeCategory: "below_poverty_line",
        },
        isActive: true,
      },
      {
        name: "Skill India Mission",
        description:
          "Free skill development training programs under PMKVY scheme.",
        schemeType: "central",
        benefitType: "training",
        minAge: 15,
        maxAge: 45,
        genderEligibility: "all",
        requiredDocuments: ["aadhaar"],
        eligibilityRules: {},
        isActive: true,
      },
      {
        name: "Pradhan Mantri Mudra Yojana",
        description:
          "Loans up to Rs. 10 lakh for small businesses and micro enterprises.",
        schemeType: "central",
        benefitType: "loan",
        benefitAmountMax: 1000000,
        minAge: 18,
        genderEligibility: "all",
        requiredDocuments: ["aadhaar", "pan"],
        eligibilityRules: {
          businessType: ["manufacturing", "services", "trading"],
        },
        isActive: true,
      },
    ];

    for (const scheme of schemes) {
      await GovernmentScheme.findOneAndUpdate({ name: scheme.name }, scheme, {
        upsert: true,
        new: true,
      });
    }
    console.log(`✅ Seeded ${schemes.length} government schemes\n`);

    // Seed Admin User
    console.log("📋 Seeding admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const existingAdmin = await User.findOne({ phone: "9999999999" });

    if (!existingAdmin) {
      await User.create({
        phone: "9999999999",
        email: "admin@hackforge.com",
        role: "admin",
        passwordHash: hashedPassword,
        isProfileComplete: true,
        isActive: true,
      });
      console.log("✅ Admin user created");
      console.log("   Phone: 9999999999");
      console.log("   Password: admin123\n");
    } else {
      console.log("ℹ️ Admin user already exists\n");
    }

    console.log("🎉 Database seeding completed successfully!\n");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run seeder
seedData();
