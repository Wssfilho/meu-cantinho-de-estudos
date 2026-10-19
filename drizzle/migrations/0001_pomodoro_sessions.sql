-- Focus time belongs to the signed-in user. Breaks are never persisted here.
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  target_seconds INTEGER NOT NULL DEFAULT 1500 CHECK (target_seconds BETWEEN 1 AND 86400),
  completed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT study_sessions_valid_time CHECK (ended_at > started_at),
  CONSTRAINT study_sessions_valid_duration CHECK (
    duration_seconds <= target_seconds
    AND duration_seconds <= EXTRACT(EPOCH FROM (ended_at - started_at)) + 1
  ),
  CONSTRAINT study_sessions_valid_completion CHECK (completed = (duration_seconds = target_seconds))
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
-- Override project defaults: clients may only append their own immutable records.
REVOKE ALL ON TABLE public.study_sessions FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.study_sessions TO authenticated;
GRANT ALL ON TABLE public.study_sessions TO service_role;
CREATE POLICY "Users view own study sessions" ON public.study_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own study sessions" ON public.study_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX study_sessions_user_ended_idx ON public.study_sessions(user_id, ended_at DESC, id);
