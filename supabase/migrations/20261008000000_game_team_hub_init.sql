-- ==============================================================================
-- Game Team Hub: MVP v0.1 Initial Schema & RLS Policies (Idempotent)
-- ==============================================================================

-- 1. PROFILES
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default 'Game Dev',
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Trigger tự động tạo profile khi user mới đăng ký Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, display_name, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- 2. PROJECTS
create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text default '',
    status text not null default 'active',
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- 3. PROJECT_MEMBERS
create table if not exists public.project_members (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    role text not null check (role in ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
    created_at timestamptz not null default now(),
    unique(project_id, user_id)
);

-- Trigger tự động gán creator thành OWNER trong project_members khi tạo project
create or replace function public.handle_new_project_owner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    if new.created_by is not null then
        insert into public.project_members (project_id, user_id, role)
        values (new.id, new.created_by, 'OWNER')
        on conflict (project_id, user_id) do nothing;
    end if;
    return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
    after insert on public.projects
    for each row execute function public.handle_new_project_owner();


-- 4. TASKS
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    title text not null,
    description text default '',
    status text not null default 'TODO' check (status in ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED')),
    priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
    assignee_id uuid references public.profiles(id) on delete set null,
    creator_id uuid references public.profiles(id) on delete set null,
    progress integer not null default 0 check (progress >= 0 and progress <= 100),
    deadline timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- 5. TASK_CHECKLIST_ITEMS
create table if not exists public.task_checklist_items (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    label text not null,
    done boolean not null default false,
    position integer not null default 0,
    created_at timestamptz not null default now()
);


-- 6. FILES
create table if not exists public.files (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    folder text not null default 'general',
    name text not null,
    file_key text not null,
    size bigint not null,
    mime text,
    uploaded_by uuid references public.profiles(id) on delete set null,
    linked_task_id uuid references public.tasks(id) on delete set null,
    created_at timestamptz not null default now()
);


-- 7. GAMEPLAY_VIDEOS
create table if not exists public.gameplay_videos (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    version text not null default '1.0',
    title text not null,
    description text default '',
    file_key text not null,
    thumbnail_key text,
    duration real default 0,
    size bigint not null,
    uploaded_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);


-- 8. UPLOADS (Tracking multipart state)
create table if not exists public.uploads (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete set null,
    kind text not null check (kind in ('video', 'build', 'file')),
    key text not null,
    r2_upload_id text not null,
    status text not null default 'pending' check (status in ('pending', 'completed', 'aborted')),
    size bigint not null,
    created_at timestamptz not null default now()
);


-- ==============================================================================
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS)
-- ==============================================================================

create or replace function public.current_user_project_role(p_project_id uuid)
returns text
language sql
security definer
stable
as $$
    select role from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
    limit 1;
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
stable
as $$
    select exists (
        select 1 from public.project_members
        where project_id = p_project_id and user_id = auth.uid()
    );
$$;


-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.files enable row level security;
alter table public.gameplay_videos enable row level security;
alter table public.uploads enable row level security;


-- ==============================================================================
-- RLS POLICIES (Có DROP IF EXISTS để chạy lại bao nhiêu lần cũng không báo lỗi)
-- ==============================================================================

-- 1. PROFILES
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
    on public.profiles for select
    to authenticated
    using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id);


-- 2. PROJECTS
drop policy if exists "Members can view projects" on public.projects;
create policy "Members can view projects"
    on public.projects for select
    to authenticated
    using (public.is_project_member(id));

drop policy if exists "Authenticated users can create projects" on public.projects;
create policy "Authenticated users can create projects"
    on public.projects for insert
    to authenticated
    with check (auth.uid() = created_by);

drop policy if exists "Owners can update project" on public.projects;
create policy "Owners can update project"
    on public.projects for update
    to authenticated
    using (public.current_user_project_role(id) = 'OWNER');

drop policy if exists "Owners can delete project" on public.projects;
create policy "Owners can delete project"
    on public.projects for delete
    to authenticated
    using (public.current_user_project_role(id) = 'OWNER');


-- 3. PROJECT_MEMBERS
drop policy if exists "Members can view project members" on public.project_members;
create policy "Members can view project members"
    on public.project_members for select
    to authenticated
    using (public.is_project_member(project_id));

drop policy if exists "Owners and Admins can manage members" on public.project_members;
create policy "Owners and Admins can manage members"
    on public.project_members for insert
    to authenticated
    with check (public.current_user_project_role(project_id) in ('OWNER', 'ADMIN'));

drop policy if exists "Owners and Admins can update members" on public.project_members;
create policy "Owners and Admins can update members"
    on public.project_members for update
    to authenticated
    using (public.current_user_project_role(project_id) in ('OWNER', 'ADMIN'));

drop policy if exists "Owners and Admins can delete members" on public.project_members;
create policy "Owners and Admins can delete members"
    on public.project_members for delete
    to authenticated
    using (public.current_user_project_role(project_id) in ('OWNER', 'ADMIN'));


-- 4. TASKS
drop policy if exists "Members can view tasks" on public.tasks;
create policy "Members can view tasks"
    on public.tasks for select
    to authenticated
    using (public.is_project_member(project_id));

drop policy if exists "Owner Admin Member can create tasks" on public.tasks;
create policy "Owner Admin Member can create tasks"
    on public.tasks for insert
    to authenticated
    with check (public.current_user_project_role(project_id) in ('OWNER', 'ADMIN', 'MEMBER'));

drop policy if exists "Members can update their assigned tasks, Owners/Admins update all" on public.tasks;
create policy "Members can update their assigned tasks, Owners/Admins update all"
    on public.tasks for update
    to authenticated
    using (
        public.current_user_project_role(project_id) in ('OWNER', 'ADMIN')
        or (
            public.current_user_project_role(project_id) = 'MEMBER'
            and (assignee_id = auth.uid() or creator_id = auth.uid())
        )
    );

drop policy if exists "Owners and Admins can delete tasks" on public.tasks;
create policy "Owners and Admins can delete tasks"
    on public.tasks for delete
    to authenticated
    using (public.current_user_project_role(project_id) in ('OWNER', 'ADMIN'));


-- 5. TASK_CHECKLIST_ITEMS
drop policy if exists "Members can view task checklist" on public.task_checklist_items;
create policy "Members can view task checklist"
    on public.task_checklist_items for select
    to authenticated
    using (
        exists (
            select 1 from public.tasks
            where tasks.id = task_checklist_items.task_id
            and public.is_project_member(tasks.project_id)
        )
    );

drop policy if exists "Members can manage checklist if they can edit task" on public.task_checklist_items;
create policy "Members can manage checklist if they can edit task"
    on public.task_checklist_items for all
    to authenticated
    using (
        exists (
            select 1 from public.tasks t
            where t.id = task_checklist_items.task_id
            and (
                public.current_user_project_role(t.project_id) in ('OWNER', 'ADMIN')
                or (
                    public.current_user_project_role(t.project_id) = 'MEMBER'
                    and (t.assignee_id = auth.uid() or t.creator_id = auth.uid())
                )
            )
        )
    );


-- 6. FILES
drop policy if exists "Members can view files" on public.files;
create policy "Members can view files"
    on public.files for select
    to authenticated
    using (public.is_project_member(project_id));

drop policy if exists "Owner Admin Member can insert files" on public.files;
create policy "Owner Admin Member can insert files"
    on public.files for insert
    to authenticated
    with check (public.current_user_project_role(project_id) in ('OWNER', 'ADMIN', 'MEMBER'));

drop policy if exists "Owners and Admins can delete files" on public.files;
create policy "Owners and Admins can delete files"
    on public.files for delete
    to authenticated
    using (public.current_user_project_role(project_id) in ('OWNER', 'ADMIN'));


-- 7. GAMEPLAY_VIDEOS
drop policy if exists "Members can view gameplay videos" on public.gameplay_videos;
create policy "Members can view gameplay videos"
    on public.gameplay_videos for select
    to authenticated
    using (public.is_project_member(project_id));

drop policy if exists "Owner Admin Member can insert videos" on public.gameplay_videos;
create policy "Owner Admin Member can insert videos"
    on public.gameplay_videos for insert
    to authenticated
    with check (public.current_user_project_role(project_id) in ('OWNER', 'ADMIN', 'MEMBER'));

drop policy if exists "Owners and Admins can delete videos" on public.gameplay_videos;
create policy "Owners and Admins can delete videos"
    on public.gameplay_videos for delete
    to authenticated
    using (public.current_user_project_role(project_id) in ('OWNER', 'ADMIN'));


-- 8. UPLOADS
drop policy if exists "User can view their uploads or admin can view" on public.uploads;
create policy "User can view their uploads or admin can view"
    on public.uploads for select
    to authenticated
    using (
        user_id = auth.uid()
        or public.current_user_project_role(project_id) in ('OWNER', 'ADMIN')
    );

drop policy if exists "Owner Admin Member can init uploads" on public.uploads;
create policy "Owner Admin Member can init uploads"
    on public.uploads for insert
    to authenticated
    with check (
        auth.uid() = user_id
        and public.current_user_project_role(project_id) in ('OWNER', 'ADMIN', 'MEMBER')
    );

drop policy if exists "User can update their own upload state" on public.uploads;
create policy "User can update their own upload state"
    on public.uploads for update
    to authenticated
    using (
        user_id = auth.uid()
        or public.current_user_project_role(project_id) in ('OWNER', 'ADMIN')
    );
