-- Better-Auth schema
-- Generated for better-auth v1.x with admin plugin
-- Includes: user (+ role/ban fields), session (+ impersonatedBy), account, verification

create table if not exists public."user" (
  id               text primary key,
  name             text not null,
  email            text not null unique,
  "emailVerified"  boolean not null default false,
  image            text,
  "createdAt"      timestamp not null default now(),
  "updatedAt"      timestamp not null default now(),
  -- admin plugin fields
  role             text,
  banned           boolean,
  "banReason"      text,
  "banExpires"     timestamp
);

create table if not exists public."session" (
  id               text primary key,
  "expiresAt"      timestamp not null,
  token            text not null unique,
  "createdAt"      timestamp not null default now(),
  "updatedAt"      timestamp not null default now(),
  "ipAddress"      text,
  "userAgent"      text,
  "userId"         text not null references public."user"(id) on delete cascade,
  -- admin plugin field
  "impersonatedBy" text
);

create table if not exists public."account" (
  id                       text primary key,
  "accountId"              text not null,
  "providerId"             text not null,
  "userId"                 text not null references public."user"(id) on delete cascade,
  "accessToken"            text,
  "refreshToken"           text,
  "idToken"                text,
  "accessTokenExpiresAt"   timestamp,
  "refreshTokenExpiresAt"  timestamp,
  scope                    text,
  password                 text,
  "createdAt"              timestamp not null default now(),
  "updatedAt"              timestamp not null default now()
);

create table if not exists public."verification" (
  id           text primary key,
  identifier   text not null,
  value        text not null,
  "expiresAt"  timestamp not null,
  "createdAt"  timestamp default now(),
  "updatedAt"  timestamp default now()
);

-- Indexes for common lookups
create index if not exists session_user_id_idx      on public."session"("userId");
create index if not exists account_user_id_idx      on public."account"("userId");
create index if not exists account_provider_idx     on public."account"("providerId", "accountId");
create index if not exists verification_identifier_idx on public."verification"(identifier);
