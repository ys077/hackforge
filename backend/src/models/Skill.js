const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
      lowercase: true,
      trim: true,
    },
    nameHindi: {
      type: String,
      maxlength: 100,
    },
    category: {
      type: String,
      maxlength: 50,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    synonyms: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
skillSchema.index({ name: 1 }, { unique: true });
skillSchema.index({ category: 1 });
skillSchema.index({ usageCount: -1 });

// Static method to find or create skill
skillSchema.statics.findOrCreateSkill = async function (skillName) {
  const normalizedName = skillName.trim().toLowerCase();

  let skill = await this.findOne({ name: normalizedName });

  if (!skill) {
    skill = await this.create({
      name: normalizedName,
      usageCount: 1,
    });
  } else {
    skill.usageCount += 1;
    await skill.save();
  }

  return skill;
};

// Get popular skills
skillSchema.statics.getPopularSkills = async function (limit = 20) {
  return this.find({ isVerified: true }).sort({ usageCount: -1 }).limit(limit);
};

// Search skills
skillSchema.statics.searchSkills = async function (query, limit = 10) {
  const regex = new RegExp(query, "i");
  return this.find({
    $or: [{ name: regex }, { synonyms: query.toLowerCase() }],
    isVerified: true,
  })
    .sort({ usageCount: -1 })
    .limit(limit);
};

const Skill = mongoose.model("Skill", skillSchema);

module.exports = Skill;
