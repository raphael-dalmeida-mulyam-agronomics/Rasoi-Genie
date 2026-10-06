-- Chef Recipe Submissions: recipes submitted by approved chefs awaiting admin approval.
-- Once approved & published, the recipe is added to public.meal_kits.

create table if not exists public.chef_submissions (
  id                        text primary key,
  slug                      text,
  name                      text not null,
  tagline                   text default '',
  description               text default '',
  hero_image                text default '',
  gallery_images            text[] default '{}'::text[],
  diet                      text not null default 'veg',
  cuisine                   text not null default 'North Indian',
  dish_category             text,
  spice_level               text default 'Medium',
  servings                  integer default 2,
  prep_time_minutes         integer default 15,
  cook_time_minutes         integer default 30,
  dietary_tags              text[] default array['veg']::text[],
  allergens                 text[] default '{}'::text[],
  ingredients               jsonb default '[]'::jsonb,
  recipe_steps              jsonb default '[]'::jsonb,
  chef_id                   text not null,
  chef_name                 text not null,
  submission_status         text not null default 'pending_review',
  submitted_at              timestamptz not null default now(),
  reviewed_at               timestamptz,
  review_notes              text,
  price                     numeric,
  available_regions         text[] default '{}'::text[],
  available_storage_centres text[] default '{}'::text[],
  cities                    text[] default '{}'::text[]
);

create index if not exists chef_submissions_chef_id_idx on public.chef_submissions (chef_id);
create index if not exists chef_submissions_status_idx on public.chef_submissions (submission_status);

alter table public.chef_submissions enable row level security;

drop policy if exists "chef_submissions readable" on public.chef_submissions;
create policy "chef_submissions readable" on public.chef_submissions
  for select using (true);

drop policy if exists "chef_submissions writable" on public.chef_submissions;
create policy "chef_submissions writable" on public.chef_submissions
  for all using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.chef_submissions;
exception when others then
  null;
end $$;
