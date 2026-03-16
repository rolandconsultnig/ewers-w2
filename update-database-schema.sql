-- Database Schema Update Script for EWERS Production
-- Run this on the production server to update database schema
-- Generated: 2026-03-16

-- Set search path to public
SET search_path TO public;

-- Check and add missing columns to incidents table
DO $$
BEGIN
    -- Check if column exists before adding
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='lga') THEN
        ALTER TABLE incidents ADD COLUMN lga text;
        RAISE NOTICE 'Added lga column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='related_indicators') THEN
        ALTER TABLE incidents ADD COLUMN related_indicators integer[];
        RAISE NOTICE 'Added related_indicators column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='impacted_population') THEN
        ALTER TABLE incidents ADD COLUMN impacted_population integer;
        RAISE NOTICE 'Added impacted_population column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='media_urls') THEN
        ALTER TABLE incidents ADD COLUMN media_urls text[];
        RAISE NOTICE 'Added media_urls column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='verification_status') THEN
        ALTER TABLE incidents ADD COLUMN verification_status text DEFAULT 'unverified';
        RAISE NOTICE 'Added verification_status column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='is_pinned') THEN
        ALTER TABLE incidents ADD COLUMN is_pinned boolean DEFAULT false;
        RAISE NOTICE 'Added is_pinned column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='audio_recording_url') THEN
        ALTER TABLE incidents ADD COLUMN audio_recording_url text;
        RAISE NOTICE 'Added audio_recording_url column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='audio_transcription') THEN
        ALTER TABLE incidents ADD COLUMN audio_transcription text;
        RAISE NOTICE 'Added audio_transcription column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='reporting_method') THEN
        ALTER TABLE incidents ADD COLUMN reporting_method text DEFAULT 'text';
        RAISE NOTICE 'Added reporting_method column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='transcription_confidence') THEN
        ALTER TABLE incidents ADD COLUMN transcription_confidence integer;
        RAISE NOTICE 'Added transcription_confidence column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='processing_status') THEN
        ALTER TABLE incidents ADD COLUMN processing_status text DEFAULT 'draft';
        RAISE NOTICE 'Added processing_status column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='proposed_responder_type') THEN
        ALTER TABLE incidents ADD COLUMN proposed_responder_type text;
        RAISE NOTICE 'Added proposed_responder_type column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='final_responder_type') THEN
        ALTER TABLE incidents ADD COLUMN final_responder_type text;
        RAISE NOTICE 'Added final_responder_type column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='assigned_responder_team_id') THEN
        ALTER TABLE incidents ADD COLUMN assigned_responder_team_id integer;
        RAISE NOTICE 'Added assigned_responder_team_id column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='supervisor_id') THEN
        ALTER TABLE incidents ADD COLUMN supervisor_id integer;
        RAISE NOTICE 'Added supervisor_id column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='coordinator_id') THEN
        ALTER TABLE incidents ADD COLUMN coordinator_id integer;
        RAISE NOTICE 'Added coordinator_id column to incidents table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incidents' AND column_name='routed_at') THEN
        ALTER TABLE incidents ADD COLUMN routed_at timestamp;
        RAISE NOTICE 'Added routed_at column to incidents table';
    END IF;
END $$;

-- Check and add missing columns to users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='security_level') THEN
        ALTER TABLE users ADD COLUMN security_level integer DEFAULT 1;
        RAISE NOTICE 'Added security_level column to users table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='permissions') THEN
        ALTER TABLE users ADD COLUMN permissions jsonb DEFAULT '["view"]';
        RAISE NOTICE 'Added permissions column to users table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='department') THEN
        ALTER TABLE users ADD COLUMN department text;
        RAISE NOTICE 'Added department column to users table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='position') THEN
        ALTER TABLE users ADD COLUMN position text;
        RAISE NOTICE 'Added position column to users table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='phone_number') THEN
        ALTER TABLE users ADD COLUMN phone_number text;
        RAISE NOTICE 'Added phone_number column to users table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='email') THEN
        ALTER TABLE users ADD COLUMN email text;
        RAISE NOTICE 'Added email column to users table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='active') THEN
        ALTER TABLE users ADD COLUMN active boolean DEFAULT true;
        RAISE NOTICE 'Added active column to users table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_login') THEN
        ALTER TABLE users ADD COLUMN last_login timestamp;
        RAISE NOTICE 'Added last_login column to users table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='avatar') THEN
        ALTER TABLE users ADD COLUMN avatar text;
        RAISE NOTICE 'Added avatar column to users table';
    END IF;
END $$;

-- Update existing incidents to have default values for new columns
UPDATE incidents 
SET 
    verification_status = 'verified',
    is_pinned = false,
    reporting_method = COALESCE(reporting_method, 'text'),
    processing_status = COALESCE(processing_status, 'draft')
WHERE verification_status IS NULL OR is_pinned IS NULL;

-- Update existing users to have default values for new columns
UPDATE users 
SET 
    security_level = COALESCE(security_level, 1),
    permissions = COALESCE(permissions, '["view"]'),
    active = COALESCE(active, true)
WHERE security_level IS NULL OR permissions IS NULL OR active IS NULL;

-- Show final schema status
SELECT 
    'incidents' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'incidents' AND table_schema = 'public'

UNION ALL

SELECT 
    'users' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'

ORDER BY table_name;

-- Show any missing expected columns
SELECT 'Missing columns in incidents:' as status, column_name
FROM (VALUES 
    ('lga'), ('related_indicators'), ('impacted_population'), ('media_urls'),
    ('verification_status'), ('is_pinned'), ('audio_recording_url'), ('audio_transcription'),
    ('reporting_method'), ('transcription_confidence'), ('processing_status'),
    ('proposed_responder_type'), ('final_responder_type'), ('assigned_responder_team_id'),
    ('supervisor_id'), ('coordinator_id'), ('routed_at')
) AS t(col)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = t.col AND table_schema = 'public'
)

UNION ALL

SELECT 'Missing columns in users:' as status, column_name
FROM (VALUES 
    ('security_level'), ('permissions'), ('department'), ('position'),
    ('phone_number'), ('email'), ('active'), ('last_login'), ('avatar')
) AS t(col)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = t.col AND table_schema = 'public'
);

RAISE NOTICE 'Database schema update completed!';
