-- Migration: 005_add_scoring_result_columns.sql
-- Adds fractional scoring chair placement and focus responses to participant
-- tracking while preserving the integer current_chair and per-chair timestamps.

alter table public.participant_chair_states
  add column if not exists chair_score numeric(3,2);

alter table public.participant_chair_states
  add column if not exists focus_responses jsonb not null
  default '[]'::jsonb;

alter table public.participant_chair_states
  drop constraint if exists participant_chair_states_chair_score_check;

alter table public.participant_chair_states
  add constraint participant_chair_states_chair_score_check
  check (
    chair_score is null
    or (chair_score >= 1 and chair_score <= 4.9)
  );

comment on column public.participant_chair_states.chair_score is
  'Fractional scoring chair result (1.00-4.90); current_chair remains an integer from 1-4.';

comment on column public.participant_chair_states.focus_responses is
  'JSON array of up to four focus-response strings.';
