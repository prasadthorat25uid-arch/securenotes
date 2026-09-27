-- StudyVault Supabase Schema with Row Level Security (RLS)
-- Specifically configured for exactly three authorized friends

-- 1. Allowed study friends whitelist table
CREATE TABLE IF NOT EXISTS public.authorized_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Study Member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert the 3 authorized friends (Replace with your actual 3 friends' emails)
INSERT INTO public.authorized_friends (email, name, role)
VALUES 
    ('alex.rivera@studyvault.org', 'Alex Rivera', 'Friend 1'),
    ('sam.chen@studyvault.org', 'Sam Chen', 'Friend 2'),
    ('jordan.patel@studyvault.org', 'Jordan Patel', 'Friend 3')
ON CONFLICT (email) DO NOTHING;

-- 2. Profiles table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Only authenticated users matching the 3 friends can view profiles
CREATE POLICY "Authorized friends can view profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.authorized_friends
            WHERE lower(authorized_friends.email) = lower(auth.jwt()->>'email')
        )
    );

-- 3. Documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    title TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf', 'doc', 'docx'
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT DEFAULT 'Notes',
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    shared_with_group BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Check if requester is one of the 3 authorized friends
CREATE OR REPLACE FUNCTION public.is_authorized_friend()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.authorized_friends
        WHERE lower(authorized_friends.email) = lower(auth.jwt()->>'email')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT Policy:
-- Authorized friends can view documents that are shared with group OR uploaded by themselves
CREATE POLICY "View documents policy"
    ON public.documents FOR SELECT
    TO authenticated
    USING (
        public.is_authorized_friend() AND (
            shared_with_group = TRUE OR
            uploaded_by = auth.uid()
        )
    );

-- INSERT Policy:
-- Only authorized friends can upload documents, and uploaded_by must match their own auth.uid()
CREATE POLICY "Upload documents policy"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_authorized_friend() AND
        uploaded_by = auth.uid()
    );

-- UPDATE Policy:
-- Authorized friends can update only their own uploads
CREATE POLICY "Update documents policy"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (
        public.is_authorized_friend() AND
        uploaded_by = auth.uid()
    );

-- DELETE Policy:
-- Authorized friends can delete only their own uploads
CREATE POLICY "Delete documents policy"
    ON public.documents FOR DELETE
    TO authenticated
    USING (
        public.is_authorized_friend() AND
        uploaded_by = auth.uid()
    );

-- 4. Supabase Storage Bucket Security ('study-docs-private')
-- Bucket is PRIVATE (public = false)
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-docs-private', 'study-docs-private', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Authorized friends can read files
CREATE POLICY "Authorized friends can read private files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'study-docs-private' AND
        public.is_authorized_friend()
    );

-- Storage Policy: Authorized friends can upload files
CREATE POLICY "Authorized friends can upload private files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'study-docs-private' AND
        public.is_authorized_friend()
    );

-- Storage Policy: Users can delete only their own files
CREATE POLICY "Users can delete own files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'study-docs-private' AND
        public.is_authorized_friend() AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
