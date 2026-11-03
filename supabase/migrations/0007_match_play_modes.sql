-- DTHU: how each player plays a match (Időpontfoglaló).
-- Run: Supabase Dashboard → SQL Editor → paste and run, BEFORE deploying the code that needs it.
-- Only adds two optional columns, so the live site keeps working either way. Safe to run twice.
--
-- Each player chooses for themselves while proposing or accepting a time (or later on the agreed
-- match): 'tts' = Tabletop Simulator, 'webcam' = webcam. Empty = not chosen, counted as webcam.
-- The match's own mode (TTS / Webkamera / Hibrid) is worked out from the two in the code.

alter table public.matches add column if not exists mode_a text check (mode_a in ('tts', 'webcam'));
alter table public.matches add column if not exists mode_b text check (mode_b in ('tts', 'webcam'));
