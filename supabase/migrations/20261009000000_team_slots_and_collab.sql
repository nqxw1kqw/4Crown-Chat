-- ==============================================================================
-- Game Team Hub v2: danh tính 4 slot thật trong DB + cộng tác theo task
-- Idempotent: chạy lại bao nhiêu lần cũng không lỗi.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROFILES không còn phụ thuộc Supabase Auth nữa.
--    Danh tính = 1 trong 4 slot cục bộ, được server map sang uuid cố định.
-- ------------------------------------------------------------------------------
alter table public.profiles
    drop constraint if exists profiles_id_fkey;

alter table public.profiles
    add column if not exists slot text;

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'profiles_slot_key'
    ) then
        alter table public.profiles add constraint profiles_slot_key unique (slot);
    end if;
end $$;

-- ------------------------------------------------------------------------------
-- 2. SEED: 4 slot + 1 project + 4 membership (uuid cố định, không đổi giữa các lần chạy)
-- ------------------------------------------------------------------------------
insert into public.profiles (id, slot, display_name, avatar_url) values
    ('00000000-0000-4000-8000-000000000001', 'm1', 'カツラギ',  null),
    ('00000000-0000-4000-8000-000000000002', 'm2', 'Thu Thao',  null),
    ('00000000-0000-4000-8000-000000000003', 'm3', 'Anh Tuyet', null),
    ('00000000-0000-4000-8000-000000000004', 'm4', '多賀',      null)
on conflict (id) do update
    set slot = excluded.slot,
        display_name = excluded.display_name;

insert into public.projects (id, name, description, status, created_by) values
    ('00000000-0000-4000-8000-0000000000a1',
     'Game Team Project',
     'Dự án chung của team 4 người.',
     'active',
     '00000000-0000-4000-8000-000000000001')
on conflict (id) do update
    set name = excluded.name,
        description = excluded.description;

insert into public.project_members (project_id, user_id, role) values
    ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'OWNER'),
    ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000002', 'ADMIN'),
    ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000003', 'MEMBER'),
    ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000004', 'VIEWER')
on conflict (project_id, user_id) do update
    set role = excluded.role;

-- ------------------------------------------------------------------------------
-- 3. TASKS: thêm loại công việc (tag)
-- ------------------------------------------------------------------------------
alter table public.tasks
    add column if not exists tag text;

-- ------------------------------------------------------------------------------
-- 4. GAMEPLAY_VIDEOS: cho phép đính kèm video demo vào một task
--    (files.linked_task_id đã có sẵn từ migration trước)
-- ------------------------------------------------------------------------------
alter table public.gameplay_videos
    add column if not exists linked_task_id uuid references public.tasks(id) on delete set null;

-- ------------------------------------------------------------------------------
-- 5. TASK_COMMENTS: thảo luận ngay trên task
-- ------------------------------------------------------------------------------
create table if not exists public.task_comments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    author_id uuid references public.profiles(id) on delete set null,
    body text not null,
    created_at timestamptz not null default now()
);

create index if not exists task_comments_task_id_idx
    on public.task_comments (task_id, created_at);

-- ------------------------------------------------------------------------------
-- 6. TASK_ACTIVITY: nhật ký ai đã làm gì (activity log)
-- ------------------------------------------------------------------------------
create table if not exists public.task_activity (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    actor_id uuid references public.profiles(id) on delete set null,
    action text not null,
    field text,
    from_value text,
    to_value text,
    created_at timestamptz not null default now()
);

create index if not exists task_activity_task_id_idx
    on public.task_activity (task_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 7. updated_at tự động cho tasks
-- ------------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
    before update on public.tasks
    for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------------------
-- 8. RLS cho bảng mới.
--    App server dùng service_role (bypass RLS); trình duyệt KHÔNG bao giờ gọi
--    Supabase trực tiếp. Không có policy nào cho anon/authenticated => deny-all,
--    đây là lớp phòng thủ thứ hai nếu service_role key bị lộ ra client.
-- ------------------------------------------------------------------------------
alter table public.task_comments enable row level security;
alter table public.task_activity enable row level security;
