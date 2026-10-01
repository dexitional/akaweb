import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

async function main() {
  const { DATABASE_URL, SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;

  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in the environment.");
  }

  const connection = await mysql.createConnection({ uri: DATABASE_URL });
  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);

  // Idempotent: re-running after changing SEED_ADMIN_PASSWORD rotates the
  // existing super admin's password instead of erroring on the duplicate email.
  await connection.query(
    `INSERT INTO admins (full_name, email, role, password_hash)
     VALUES (?, ?, 'super_admin', ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'super_admin',
       is_active = 1, failed_login_attempts = 0, locked_until = NULL`,
    [SEED_ADMIN_NAME ?? "System Administrator", SEED_ADMIN_EMAIL.toLowerCase(), passwordHash],
  );

  console.log(`Seeded super admin: ${SEED_ADMIN_EMAIL}`);
  await connection.end();
}

main();
