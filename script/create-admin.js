const bcrypt = require("bcryptjs");

// Thay đổi thông tin admin tại đây
const adminData = {
  email: "admin@runningclub.local",
  username: "admin",
  password: "1234567890", // ĐỔI MẬT KHẨU NÀY!
  full_name: "Administrator",
  role: "super_admin",
};

async function createPasswordHash() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(adminData.password, salt);

  console.log("\n=== THÔNG TIN ADMIN ===");
  console.log("Email:", adminData.email);
  console.log("Username:", adminData.username);
  console.log("Password:", adminData.password);
  console.log("Full Name:", adminData.full_name);
  console.log("Role:", adminData.role);
  console.log("\n=== PASSWORD HASH ===");
  console.log(hash);
  console.log("\n=== SQL INSERT ===");
  console.log(`
INSERT INTO admins (email, username, password_hash, full_name, role)
VALUES (
  '${adminData.email}',
  '${adminData.username}',
  '${hash}',
  '${adminData.full_name}',
  '${adminData.role}'
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();
  `);
  console.log("\nSao chép SQL trên và chạy trong Supabase SQL Editor\n");
}

createPasswordHash();
