REVOKE EXECUTE ON FUNCTION public._storage_path_from_url(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._delete_storage_object(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_portfolio_project_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_job_tracker_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_job_slip_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_article_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_chat_message_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_announcement_storage() FROM PUBLIC, anon, authenticated;