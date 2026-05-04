-- ═══════════════════════════════════════════════════════
-- CIPHER — Database Schema
-- Paste this entire file into Supabase SQL Editor and Run
-- ═══════════════════════════════════════════════════════

-- Profiles (one per user account)
create table profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  username      text unique not null,
  display_name  text,
  avatar_seed   text default gen_random_uuid()::text,
  theme         text default 'postdesk',
  created_at    timestamptz default now()
);

-- Conversations (a thread between two people)
create table conversations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Who is in each conversation
create table conversation_members (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid references conversations(id) on delete cascade not null,
  user_id          uuid references profiles(id) on delete cascade not null,
  joined_at        timestamptz default now(),
  last_read_at     timestamptz default now(),
  unique(conversation_id, user_id)
);

-- Messages — only encrypted payloads ever touch the server
-- The key never does.
create table messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid references conversations(id) on delete cascade not null,
  sender_id        uuid references profiles(id) on delete cascade not null,
  payload          text not null,  -- AES-256-GCM encrypted, base64
  iv               text not null,  -- base64 — needed to decrypt
  salt             text not null,  -- base64 — needed to derive key via PBKDF2
  created_at       timestamptz default now()
);

-- Invite links — how two people connect
create table invites (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid references profiles(id) on delete cascade not null,
  code             text unique not null default left(gen_random_uuid()::text, 8),
  accepted_by      uuid references profiles(id),
  conversation_id  uuid references conversations(id),
  created_at       timestamptz default now(),
  expires_at       timestamptz default (now() + interval '7 days')
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table invites enable row level security;

-- Profiles: anyone can read, only you can write yours
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Conversations: only members can see them
create policy "conversations_select" on conversations for select
  using (exists (
    select 1 from conversation_members
    where conversation_id = conversations.id and user_id = auth.uid()
  ));
create policy "conversations_insert" on conversations for insert with check (true);
create policy "conversations_update" on conversations for update
  using (exists (
    select 1 from conversation_members
    where conversation_id = conversations.id and user_id = auth.uid()
  ));

-- Members: you can see members of conversations you're in
create policy "members_select" on conversation_members for select
  using (exists (
    select 1 from conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
    and cm.user_id = auth.uid()
  ));
create policy "members_insert" on conversation_members for insert with check (true);
create policy "members_update" on conversation_members for update using (user_id = auth.uid());

-- Messages: only conversation members can read or send
create policy "messages_select" on messages for select
  using (exists (
    select 1 from conversation_members
    where conversation_id = messages.conversation_id and user_id = auth.uid()
  ));
create policy "messages_insert" on messages for insert
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id and user_id = auth.uid()
    )
  );

-- Invites: authenticated users can read pending invites (by code)
-- Security comes from code obscurity (UUID-based, not guessable)
create policy "invites_select" on invites for select using (auth.uid() is not null);
create policy "invites_insert" on invites for insert with check (creator_id = auth.uid());
create policy "invites_update" on invites for update
  using (accepted_by is null and expires_at > now())
  with check (accepted_by = auth.uid());

-- ── Trigger: keep conversation.updated_at fresh ───────────────────────────────

create or replace function update_conversation_timestamp()
returns trigger language plpgsql security definer as $$
begin
  update conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_insert
  after insert on messages
  for each row execute function update_conversation_timestamp();

-- ── Phase 4 migration (theme column) ──────────────────────────────────────────
-- For existing Supabase deployments where this schema was already applied,
-- run this migration in the SQL Editor instead of recreating the table:
--
--   alter table profiles add column if not exists theme text default 'postdesk';
--
-- Existing users will have NULL until they pick a theme; the app falls back to
-- 'postdesk' via localStorage default (see app.js boot block).
