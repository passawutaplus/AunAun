-- Aplus1 content intelligence (admin)
-- Functions live on remote via MCP apply_migration (admin_content_insights, admin_export_data_pack pack=content).
COMMENT ON FUNCTION public.admin_content_insights(int) IS
  'Admin-only content performance: hot/cold projects, category rollups, opportunity gaps';
