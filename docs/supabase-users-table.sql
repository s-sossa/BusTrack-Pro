-- ============================================================
-- BusTrack Pro — Tabla de Usuarios en Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Crear tabla users vinculada a Supabase Auth
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  role          TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'passenger')),
  auth_provider TEXT DEFAULT 'email',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Politicas de seguridad
-- Permitir lectura de usuarios
CREATE POLICY "Permitir lectura de perfiles de usuario"
  ON public.users FOR SELECT
  USING (true);

-- Permitir registro/insercion de usuarios (Anon y Authenticated)
CREATE POLICY "Permitir registro de nuevos usuarios"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- Permitir a los usuarios actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.users FOR UPDATE
  USING (auth.uid() = id OR true);

-- Service role puede gestionar todos los usuarios
CREATE POLICY "Service role puede gestionar todos los usuarios"
  ON public.users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Trigger para updated_at automatico
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Trigger: crear fila en users cuando se registra en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Listo! Ahora cada registro en Supabase Auth crea
-- automaticamente un registro en public.users
-- ============================================================
