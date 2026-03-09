/**
 * MongoDB compatibility layer for Sequelize Op operators
 * This provides a similar interface to Sequelize's Op but returns MongoDB query operators
 *
 * Usage: Instead of { [Op.gte]: 10 }, use { $gte: 10 }
 * This module exports symbols that can be used similarly to Sequelize's Op
 */

// MongoDB query operators as symbols (for compatibility with code that uses Op)
const Op = {
  // Comparison
  eq: "$eq",
  ne: "$ne",
  gt: "$gt",
  gte: "$gte",
  lt: "$lt",
  lte: "$lte",
  in: "$in",
  notIn: "$nin",
  between: "$between", // Custom - needs transformation
  notBetween: "$notBetween", // Custom - needs transformation

  // Logical
  and: "$and",
  or: "$or",
  not: "$not",

  // String
  like: "$regex",
  notLike: "$not",
  iLike: "$regex", // Case insensitive - use with 'i' option

  // Array
  contains: "$all",
  overlap: "$in",

  // Null
  is: "$eq",

  // Existence
  exists: "$exists",
};

/**
 * Helper to convert Sequelize-style queries to MongoDB
 * Note: This is a basic converter - complex queries may need manual adjustment
 */
const convertSequelizeToMongo = (sequelizeQuery) => {
  if (!sequelizeQuery || typeof sequelizeQuery !== "object") {
    return sequelizeQuery;
  }

  const mongoQuery = {};

  for (const [key, value] of Object.entries(sequelizeQuery)) {
    if (key === Op.or || key === "$or") {
      mongoQuery.$or = Array.isArray(value)
        ? value.map(convertSequelizeToMongo)
        : [convertSequelizeToMongo(value)];
    } else if (key === Op.and || key === "$and") {
      mongoQuery.$and = Array.isArray(value)
        ? value.map(convertSequelizeToMongo)
        : [convertSequelizeToMongo(value)];
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // Handle nested operators
      mongoQuery[key] = convertSequelizeToMongo(value);
    } else {
      mongoQuery[key] = value;
    }
  }

  return mongoQuery;
};

module.exports = {
  Op,
  convertSequelizeToMongo,
};
