/** Shared SQL fixes for unified rvnzjiskqliexysicfmh (anthem + shared schemas). */

export const ANTHEM_TABLES = [
  "projects",
  "project_likes",
  "project_comments",
  "project_views",
  "project_bookmarks",
  "follows",
  "collab_requests",
  "hiring_requests",
  "studios",
  "studio_members",
  "studio_formation_requests",
  "studio_formation_invites",
  "job_posts",
  "job_applications",
  "collections",
  "collection_items",
  "ad_campaigns",
  "ad_events",
  "ad_applications",
  "inspire_boards",
  "inspire_items",
  "image_likes",
  "image_shares",
  "app_feedback",
  "user_reports",
];

export const SHARED_TABLES = [
  "wallets",
  "wallet_topups",
  "cashout_requests",
  "gifts",
  "gift_transactions",
  "gift_limits_config",
  "contracts",
  "admin_audit_log",
  "conversations",
  "messages",
  "aml_flags",
  "kyc_requests",
  "notifications",
];

export function sanitizeBundleSql(sql) {
  let s = sql;
  if (s.includes("storage.buckets")) {
    s = s.replace(
      /(INSERT INTO storage\.buckets[\s\S]*?)ON CONFLICT \(user_id\) DO NOTHING/g,
      "$1ON CONFLICT (id) DO NOTHING",
    );
  }
  if (s.includes("INSERT INTO auth.users")) {
    s = s.replace(
      /(INSERT INTO auth\.users[\s\S]*?)ON CONFLICT \(user_id\) DO NOTHING/g,
      "$1ON CONFLICT (id) DO NOTHING",
    );
  }
  for (const t of ANTHEM_TABLES) {
    s = s.replaceAll(`public.${t}`, `anthem.${t}`);
  }
  for (const t of SHARED_TABLES) {
    s = s.replaceAll(`public.${t}`, `shared.${t}`);
  }
  s = s.replaceAll("public.is_studio_admin", "anthem.is_studio_admin");
  s = s.replaceAll("public.is_studio_member", "anthem.is_studio_member");
  s = s.replaceAll("public.is_formation_participant", "anthem.is_formation_participant");
  s = s.replace(/(?<!anthem\.)(?<!shared\.)is_studio_admin\(/g, "anthem.is_studio_admin(");
  s = s.replace(/(?<!anthem\.)(?<!shared\.)is_studio_member\(/g, "anthem.is_studio_member(");
  s = s.replace(
    /VALUES \(NEW\.id, 'admin'::app_role\)/g,
    "VALUES (COALESCE(NEW.user_id, NEW.id), 'admin'::app_role)",
  );
  s = s.replace(
    /SELECT id, 'admin'::app_role FROM public\.profiles WHERE email = 'passawut\.a\.plus@gmail\.com'/g,
    "SELECT COALESCE(user_id, id), 'admin'::app_role FROM public.profiles WHERE email = 'passawut.a.plus@gmail.com'",
  );
  return s;
}

export function transformSeedSql(sql) {
  let s = sanitizeBundleSql(sql);
  s = s.replace(
    /INSERT INTO public\.profiles \(\s*id,/g,
    "INSERT INTO public.profiles (user_id, id,",
  );
  s = s.replace(
    /\) VALUES \(\s*uid,\s*\n\s*names\[/g,
    ") VALUES (uid, uid,\n      names[",
  );
  s = s.replace(
    /SELECT display_name FROM public\.profiles WHERE id = uid/g,
    "SELECT display_name FROM public.profiles WHERE user_id = uid",
  );
  s = s.replace(
    /SELECT email FROM public\.profiles WHERE id = uid/g,
    "SELECT email FROM public.profiles WHERE user_id = uid",
  );
  s = s.replace(/WHERE user_id = uid/g, "WHERE user_id = uid");
  s = s.replace(/WHERE id = uid\b/g, "WHERE user_id = uid");
  s = s.replace(/\.eq\("id", uid\)/g, '.eq("user_id", uid)');
  s = s.replace(/GREATEST\(public\.wallets/g, "GREATEST(shared.wallets");
  s = s.replace(
    /INSERT INTO public\.profiles[\s\S]*?ON CONFLICT \(id\) DO UPDATE/g,
    (block) => block.replace("ON CONFLICT (id) DO UPDATE", "ON CONFLICT (user_id) DO UPDATE"),
  );
  return s;
}

export function isBenignSqlError(body, status) {
  return (
    /already exists|duplicate_object|duplicate key|does not exist|skipping/i.test(body) ||
    /user_roles_user_id_fkey|violates foreign key constraint/i.test(body) ||
    (status === 400 && /DROP TABLE.*does not exist/i.test(body))
  );
}
