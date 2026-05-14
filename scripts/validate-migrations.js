#!/usr/bin/env node

/**
 * Migration Validation Script
 * Checks that all migration files have proper syntax and are idempotent
 */

const fs = require("fs");
const path = require("path");

console.log("\n📋 Validating Database Migrations...\n");

const migrationsDir = path.join(__dirname, "../src/db/migrations");

// Read all migration files
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql") && f !== "migrations.js")
  .sort();

console.log(`Found ${files.length} migration files\n`);

let errors = [];
let warnings = [];

// Validation rules
const validations = {
  hasBackticks: (sql) => {
    // SQLite identifiers should use backticks when necessary
    const hasBackticks = sql.includes("`");
    const hasSingleQuotes = sql.match(/ALTER TABLE '[^']*'/);
    if (hasSingleQuotes && !hasBackticks) {
      return {
        valid: false,
        message: "Uses single quotes for identifiers instead of backticks",
      };
    }
    return { valid: true };
  },

  noMalformedQuotes: (sql) => {
    // Check for malformed quotes like 'column_name 'TEXT
    const malformed = sql.match(/`[a-z_]+\s+'/);
    if (malformed) {
      return {
        valid: false,
        message: `Malformed quote pattern: ${malformed[0]}`,
      };
    }
    return { valid: true };
  },

  correctTableNames: (sql) => {
    // Check for singular vs plural issues
    const singularPatterns = [
      /ALTER TABLE ['`]account['`]/i,
      /ALTER TABLE ['`]user['`]/i,
      /ALTER TABLE ['`]transaction['`]/i,
      /ALTER TABLE ['`]categor['`]/i,
      /ALTER TABLE ['`]budget['`]/i,
      /ALTER TABLE ['`]goal['`]/i,
      /ALTER TABLE ['`]merchant['`]/i,
      /ALTER TABLE ['`]notification['`]/i,
    ];

    for (const pattern of singularPatterns) {
      if (pattern.test(sql)) {
        return {
          valid: false,
          message: `Singular table name found. Most tables should be plural.`,
        };
      }
    }
    return { valid: true };
  },

  isIdempotent: (sql) => {
    // ALTER TABLE mutations should use IF NOT EXISTS
    if (sql.includes("ALTER TABLE") && sql.includes("ADD COLUMN")) {
      if (!sql.includes("IF NOT EXISTS")) {
        return {
          valid: false,
          message:
            "ADD COLUMN statement should use IF NOT EXISTS for idempotency",
        };
      }
    }
    return { valid: true };
  },

  properCase: (sql) => {
    // SQL keywords should be uppercase
    const lowerKeywords = sql.match(
      /alter table|add column|text|integer|default/i,
    );
    if (lowerKeywords) {
      const keyword = lowerKeywords[0];
      if (keyword !== keyword.toUpperCase()) {
        return {
          valid: false,
          message: `Keyword '${keyword}' should be uppercase: '${keyword.toUpperCase()}'`,
        };
      }
    }
    return { valid: true };
  },
};

// Validate each file
files.forEach((file) => {
  const filepath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filepath, "utf8").trim();

  console.log(`\n📄 ${file}`);

  // Run all validations
  let fileHasErrors = false;

  for (const [ruleName, ruleFn] of Object.entries(validations)) {
    const result = ruleFn(content);

    if (!result.valid) {
      console.log(`  ✗ ${ruleName}: ${result.message}`);
      errors.push(`${file}: ${result.message}`);
      fileHasErrors = true;
    } else {
      console.log(`  ✓ ${ruleName}`);
    }
  }

  // Check migration size
  if (content.length > 10000) {
    console.log(`  ⚠ Large migration (${content.length} bytes)`);
    warnings.push(`${file} is large (${content.length} bytes)`);
  } else {
    console.log(`  ✓ Reasonable migration size (${content.length} bytes)`);
  }

  if (!fileHasErrors) {
    console.log("  ✅ All checks passed");
  }
});

// Summary
console.log("\n" + "=".repeat(50));
console.log("\n📊 Validation Summary\n");

if (errors.length === 0) {
  console.log("✅ All migrations are valid!\n");
  console.log("Status:");
  console.log(`  • ${files.length} migration files checked`);
  console.log(`  • 0 errors found`);
  if (warnings.length > 0) {
    console.log(`  • ${warnings.length} warnings\n`);
  } else {
    console.log("  • 0 warnings\n");
  }
} else {
  console.log(`❌ Found ${errors.length} error(s):\n`);
  errors.forEach((err, idx) => {
    console.log(`  ${idx + 1}. ${err}`);
  });
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s):\n`);
    warnings.forEach((warn, idx) => {
      console.log(`  ${idx + 1}. ${warn}`);
    });
  }
  console.log();
  process.exit(1);
}

// Verify schema validation layer
console.log("🔍 Checking schema validation layer...\n");
const schemaValidationPath = path.join(
  __dirname,
  "../src/db/schema-validation.ts",
);
const schemaContent = fs.readFileSync(schemaValidationPath, "utf8");

const checksToPerform = [
  {
    name: "Uses IF NOT EXISTS",
    check: () => schemaContent.includes("IF NOT EXISTS"),
    critical: true,
  },
  {
    name: "Has error handling",
    check: () =>
      schemaContent.includes("catch") && schemaContent.includes("error"),
    critical: true,
  },
  {
    name: "Has logging",
    check: () => schemaContent.includes("console.log"),
    critical: false,
  },
  {
    name: "Has proper table names (accounts)",
    check: () => schemaContent.includes('"accounts"'),
    critical: true,
  },
];

let schemaValid = true;
checksToPerform.forEach((check) => {
  if (check.check()) {
    console.log(`  ✓ ${check.name}`);
  } else {
    console.log(`  ${check.critical ? "✗" : "⚠"} ${check.name}`);
    if (check.critical) schemaValid = false;
  }
});

if (schemaValid) {
  console.log("\n✅ Schema validation layer looks good!\n");
} else {
  console.log("\n❌ Schema validation layer has issues!\n");
  process.exit(1);
}

console.log("🎉 Database migration system validation complete!\n");
