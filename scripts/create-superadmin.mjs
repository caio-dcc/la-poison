#!/usr/bin/env node

/**
 * Create a superadmin user for testing and management
 * Run: node scripts/create-superadmin.mjs
 *
 * Prerequisites:
 * - Must apply migration 010 first (supabase/migrations/010_admin_and_audit.sql)
 * - .env.local must have SUPABASE_* vars
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SUPERADMIN_EMAIL = "dev.caio.marques@gmail.com";

async function createSuperadmin() {
  console.log(`\n🔑 Creating superadmin: ${SUPERADMIN_EMAIL}\n`);

  try {
    // 1. Try to get existing user by email
    console.log("📧 Checking if user exists...");
    const { data: existingUser, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("❌ Failed to list users:", listError.message);
      process.exit(1);
    }

    let userId;
    const user = existingUser?.users?.find((u) => u.email === SUPERADMIN_EMAIL);

    if (user) {
      console.log(`✅ User already exists: ${user.id}`);
      userId = user.id;
    } else {
      // 2. Create new user via Admin API
      console.log(`➕ Creating new user...`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: SUPERADMIN_EMAIL,
        password: Math.random().toString(36).slice(-16), // Dummy password (won't be used)
        email_confirm: true, // Auto-confirm since we control this account
      });

      if (createError) {
        console.error("❌ Failed to create user:", createError.message);
        process.exit(1);
      }

      userId = newUser.user.id;
      console.log(`✅ User created: ${userId}`);
    }

    // 3. Upsert profile with admin role
    console.log(`\n👤 Setting admin role...`);
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        is_admin: true,
        role: "superadmin",
        display_name: "Superadmin",
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("❌ Failed to set admin role:", profileError.message);
      process.exit(1);
    }

    console.log(`✅ Admin role set`);

    // 4. Log audit event
    console.log(`\n📝 Logging audit event...`);
    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_id: userId,
      actor_email: SUPERADMIN_EMAIL,
      action: "create_superadmin",
      target_type: "user",
      target_id: userId,
      metadata: {
        script: "create-superadmin.mjs",
        timestamp: new Date().toISOString(),
      },
    });

    if (auditError) {
      console.warn("⚠️  Failed to log audit event:", auditError.message);
      // Non-fatal; continue
    } else {
      console.log(`✅ Audit event logged`);
    }

    // 5. Print instructions
    console.log(`\n${"=".repeat(60)}`);
    console.log(`✨ Superadmin Created Successfully!\n`);
    console.log(`Email: ${SUPERADMIN_EMAIL}`);
    console.log(`User ID: ${userId}`);
    console.log(`Role: superadmin`);
    console.log(`\nNext step:`);
    console.log(`1. Go to http://localhost:3000/pt/login`);
    console.log(`2. Click "Login with Google"`);
    console.log(`3. Use ${SUPERADMIN_EMAIL}`);
    console.log(`4. You'll be linked to the admin account automatically`);
    console.log(`5. Access http://localhost:3000/pt/admin after login\n`);
    console.log(`${"=".repeat(60)}\n`);
  } catch (err) {
    console.error("❌ Unexpected error:", err.message);
    process.exit(1);
  }
}

createSuperadmin();
