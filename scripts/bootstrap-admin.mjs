import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const targetAdminEmail = "s3rgushik@yandex.ru";
const projectRoot = process.cwd();
const envLocalPath = path.join(projectRoot, ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(envLocalPath)) return;

  const lines = fs.readFileSync(envLocalPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function findAuthUserByEmail(client, email) {
  const normalizedEmail = email.toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (page <= 50) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }

  throw new Error("Too many auth users for this bootstrap script. Narrow the lookup before continuing.");
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const adminSecret = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!supabaseUrl || !adminSecret) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Values were not printed.");
  }

  const client = createClient(supabaseUrl, adminSecret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const authUser = await findAuthUserByEmail(client, targetAdminEmail);
  if (!authUser) {
    console.log(`No Supabase Auth user found for ${targetAdminEmail}. Register or sign in first; no auth user was created.`);
    return;
  }

  const { data: role, error: roleError } = await client
    .from("roles")
    .select("id, code")
    .eq("code", "admin")
    .single();

  if (roleError || !role) {
    throw new Error(roleError?.message ?? "Admin role is missing in public.roles.");
  }

  const { data: existing, error: existingError } = await client
    .from("user_roles")
    .select("id")
    .eq("user_id", authUser.id)
    .eq("role_id", role.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    console.log(`Admin role is already active for ${targetAdminEmail}.`);
    return;
  }

  const { error: insertError } = await client.from("user_roles").insert({
    user_id: authUser.id,
    role_id: role.id,
  });

  if (insertError) throw insertError;

  console.log(`Admin role granted for ${targetAdminEmail}. Authorization remains RBAC/user_roles based.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Admin bootstrap failed.");
  process.exitCode = 1;
});
