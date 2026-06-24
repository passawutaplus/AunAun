
create extension if not exists vector;

-- 1. ai_training_samples
create table public.ai_training_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  feature text not null,
  model text,
  system_prompt_version text,
  user_prompt text not null,
  ai_response text not null,
  user_rating smallint,
  corrected_response text,
  status text not null default 'pending',
  tokens_used integer default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ai_training_samples_user on public.ai_training_samples(user_id);
create index idx_ai_training_samples_status on public.ai_training_samples(status);
create index idx_ai_training_samples_feature on public.ai_training_samples(feature);

alter table public.ai_training_samples enable row level security;

create policy "Users insert own samples" on public.ai_training_samples
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users view own samples" on public.ai_training_samples
  for select to authenticated using (auth.uid() = user_id);
create policy "Users update own samples rating" on public.ai_training_samples
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins view all samples" on public.ai_training_samples
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update all samples" on public.ai_training_samples
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete samples" on public.ai_training_samples
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_ai_training_samples_updated
before update on public.ai_training_samples
for each row execute function public.update_updated_at_column();

-- 2. ai_knowledge_base
create table public.ai_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  source_sample_id uuid references public.ai_training_samples(id) on delete set null,
  feature text not null,
  prompt text not null,
  ideal_response text not null,
  embedding vector(1536),
  tags text[] not null default '{}',
  approved_by uuid,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_ai_knowledge_feature on public.ai_knowledge_base(feature);
create index idx_ai_knowledge_embedding on public.ai_knowledge_base
  using hnsw (embedding vector_cosine_ops);

alter table public.ai_knowledge_base enable row level security;

create policy "Admins manage knowledge base" on public.ai_knowledge_base
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 3. ai_personality_settings (singleton — one row)
create table public.ai_personality_settings (
  id uuid primary key default gen_random_uuid(),
  creativity numeric not null default 0.7,
  formality numeric not null default 0.5,
  detail_level numeric not null default 0.5,
  forbidden_keywords text[] not null default '{}',
  system_prompt_override text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.ai_personality_settings enable row level security;

create policy "Anyone authenticated reads personality" on public.ai_personality_settings
  for select to authenticated using (true);
create policy "Admins update personality" on public.ai_personality_settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_ai_personality_updated
before update on public.ai_personality_settings
for each row execute function public.update_updated_at_column();

-- seed one row
insert into public.ai_personality_settings (creativity, formality, detail_level, forbidden_keywords)
values (0.7, 0.5, 0.5, '{}');

-- RPC for similarity search (knowledge base)
create or replace function public.match_ai_knowledge(
  query_embedding vector(1536),
  match_feature text,
  match_count int default 3
)
returns table (
  id uuid,
  feature text,
  prompt text,
  ideal_response text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    k.id,
    k.feature,
    k.prompt,
    k.ideal_response,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.ai_knowledge_base k
  where k.feature = match_feature
    and k.embedding is not null
  order by k.embedding <=> query_embedding
  limit match_count;
$$;
