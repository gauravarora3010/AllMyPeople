-- ==========================================
-- 1. SETUP & UTILITIES
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums (Strict Categories)
-- We use ENUMS for the high-level grouping, but TEXT for the specific roles (Father, Boss)
-- because the list of roles is too long and might change.
CREATE TYPE relation_category AS ENUM ('Family', 'Social', 'Professional', 'Other');
CREATE TYPE person_sex AS ENUM ('Male', 'Female', 'Other');

-- Helper: Auto-update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 2. TABLES
-- ==========================================

-- A. PROFILES (The User Settings)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    -- User Preferences (Theme, Default Graph, etc.)
    settings JSONB DEFAULT '{"theme": "system", "auto_save": true}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- B. GRAPHS (The "Trees" / Projects)
CREATE TABLE graphs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    
    -- Graph-Specific Settings (e.g., Default Gravity, Background Color)
    settings JSONB DEFAULT '{"layout_mode": "force_atlas", "gravity": 1}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- C. NODES (The People)
CREATE TABLE nodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE NOT NULL,
    
    -- Core Identity
    full_name TEXT NOT NULL,
    nickname TEXT,
    sex person_sex DEFAULT 'Other',
    dob DATE,
    location TEXT,
    profession TEXT,
    photo_url TEXT, -- Link to Storage Bucket
    
    -- Visual Position (Critical for Layout)
    layout_x FLOAT DEFAULT 0,
    layout_y FLOAT DEFAULT 0,
    color TEXT DEFAULT '#9ca3af', -- Default Gray

    -- Contact & Socials (Stored as JSON for flexibility)
    contact_info JSONB DEFAULT '{}'::jsonb, -- e.g. {"phone": "...", "email": "..."}
    social_links JSONB DEFAULT '{}'::jsonb, -- e.g. {"instagram": "...", "linkedin": "..."}
    notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- D. EDGES (The Relationships)
CREATE TABLE edges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE NOT NULL,
    
    source UUID REFERENCES nodes(id) ON DELETE CASCADE NOT NULL,
    target UUID REFERENCES nodes(id) ON DELETE CASCADE NOT NULL,
    
    category relation_category NOT NULL,
    type TEXT NOT NULL, -- "Father", "Boss", "Friend"
    label TEXT, -- Optional display text on the line

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- ==========================================
-- 3. SECURITY (Row Level Security)
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING ( true );
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING ( auth.uid() = id );

-- Graphs (Users manage their own trees)
CREATE POLICY "Users can CRUD own graphs" ON graphs FOR ALL USING ( auth.uid() = owner_id );

-- Nodes (Access allowed if you own the parent Graph)
CREATE POLICY "Users can CRUD nodes in their graphs" ON nodes FOR ALL 
USING ( EXISTS (SELECT 1 FROM graphs WHERE id = nodes.graph_id AND owner_id = auth.uid()) );

-- Edges (Access allowed if you own the parent Graph)
CREATE POLICY "Users can CRUD edges in their graphs" ON edges FOR ALL 
USING ( EXISTS (SELECT 1 FROM graphs WHERE id = edges.graph_id AND owner_id = auth.uid()) );

-- ==========================================
-- 4. TRIGGERS (Automation)
-- ==========================================

-- Trigger: Auto-Create Profile & Default Graph on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  new_graph_id UUID;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- 2. Create Default Graph
  INSERT INTO public.graphs (owner_id, name, description, created_by)
  VALUES (new.id, 'My Network', 'My first relationship graph', new.id)
  RETURNING id INTO new_graph_id;

  -- 3. Create "Me" Node automatically
  INSERT INTO public.nodes (graph_id, full_name, nickname, layout_x, layout_y, created_by)
  VALUES (
    new_graph_id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Me'), 
    'Me', 
    0, 0, 
    new.id
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger: Update Timestamps
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_graphs_modtime BEFORE UPDATE ON graphs FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_nodes_modtime BEFORE UPDATE ON nodes FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_edges_modtime BEFORE UPDATE ON edges FOR EACH ROW EXECUTE PROCEDURE update_modified_column();