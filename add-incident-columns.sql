-- Add new columns to incidents table for voice reporting and pinning
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS audio_recording_url TEXT,
ADD COLUMN IF NOT EXISTS audio_transcription TEXT,
ADD COLUMN IF NOT EXISTS reporting_method TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS transcription_confidence INTEGER,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
