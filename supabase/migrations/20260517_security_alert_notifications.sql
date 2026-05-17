alter table public.notification_preferences
  add column if not exists security_alerts boolean not null default true;
