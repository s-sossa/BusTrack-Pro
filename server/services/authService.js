/* ==============================================================================
   BusTrack Pro — Authentication Service (Email + Supabase Auth)
   ✅ No se usa Google ni Apple sign-in directo.
   ✅ Rol por defecto: 'passenger'. Solo admins se asignan manualmente.
   ============================================================================== */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { db } from '../database/db.js';
import { supabase, isSupabaseConfigured } from '../supabase.js';

export class AuthService {
  /** Generate JWT Token */
  static generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  /** Register user with Email & Password */
  static async registerWithEmail({ email, password, name, consentTerms }) {
    if (!consentTerms) {
      throw new Error('Debes aceptar los Términos y la Política de Privacidad para registrarte.');
    }

    if (!email || !password || !name) {
      throw new Error('Todos los campos son obligatorios.');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    // 1. Si Supabase está configurado, intentar registrar allí primero (es la fuente de verdad)
    let supabaseUserId = null;
    if (isSupabaseConfigured) {
      try {
        const { data: supaData, error: supaError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { name: cleanName },
          },
        });

        if (supaError) {
          // Si ya existe el usuario en Supabase Auth, tratamos de hacer login para verificar
          if (supaError.message.includes('User already registered') || supaError.message.includes('already registered')) {
            throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
          }
          console.warn('[Supabase Auth] Aviso al registrar:', supaError.message);
        } else if (supaData?.user) {
          supabaseUserId = supaData.user.id;

          // Guardar en la tabla 'users' de Supabase con el id del Auth
          try {
            const { error: upsertError } = await supabase.from('users').upsert({
              id: supabaseUserId,
              email: cleanEmail,
              full_name: cleanName,
              role: 'passenger', // ✅ Rol por defecto: passenger, NO admin
              auth_provider: 'email',
              avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
              created_at: new Date().toISOString(),
            }, { onConflict: 'email' });

            if (upsertError) {
              console.warn('[Supabase DB] Error al guardar usuario en tabla users:', upsertError.message);
            } else {
              console.log('[Supabase DB] Usuario guardado exitosamente en tabla users:', cleanEmail);
            }
          } catch (dbErr) {
            console.warn('[Supabase DB] Tabla users no encontrada, continuando con BD local:', dbErr.message);
          }
        }
      } catch (err) {
        // Re-lanzar errores de "ya registrado"
        if (err.message.includes('ya existe') || err.message.includes('registered')) {
          throw err;
        }
        console.warn('[Supabase Auth] Error de conexión, usando BD local:', err.message);
      }
    }

    // 2. Verificar si ya existe en la base de datos local
    const existingUser = db.findUserByEmail(cleanEmail);
    if (existingUser) {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
    }

    // 3. Guardar en la base de datos local para persistencia rápida
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = db.createUser({
      ...(supabaseUserId ? { id: supabaseUserId } : {}),
      email: cleanEmail,
      passwordHash,
      name: cleanName,
      role: 'passenger', // ✅ Rol por defecto: passenger, NO admin
      provider: 'email',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
    });

    try {
      db.pushActivity(`Nuevo usuario registrado: ${cleanName} (${cleanEmail})`, 'info');
    } catch (_) {}

    const token = this.generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser, token };
  }


  /** OAuth Callback — Registra/actualiza usuario de Supabase OAuth */
  static async loginWithOAuthCallback({ supabaseId, email, name, provider, avatarUrl }) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const cleanProvider = provider || 'oauth';
    const cleanAvatar = avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;

    let existingUser = db.findUserByEmail(cleanEmail) || db.findUserById(supabaseId);

    if (existingUser) {
      const updated = db.updateUser(existingUser.id, {
        name: cleanName,
        avatarUrl: cleanAvatar,
        provider: cleanProvider,
      });
      const token = this.generateToken(updated || existingUser);
      const { passwordHash: _, ...safeUser } = updated || existingUser;
      return { user: safeUser, token };
    }

    const newUser = db.createUser({
      id: supabaseId,
      email: cleanEmail,
      name: cleanName,
      role: 'passenger', // ✅ Rol por defecto: passenger, NO admin
      provider: cleanProvider,
      avatarUrl: cleanAvatar,
      passwordHash: null,
    });

    try {
      db.pushActivity(`Nuevo usuario OAuth (${cleanProvider}): ${cleanName} (${cleanEmail})`, 'info');
    } catch (_) {}

    const token = this.generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser, token };
  }


  /** Login user with Email & Password */
  static async loginWithEmail({ email, password }) {
    if (!email || !password) {
      throw new Error('Credenciales inválidas.');
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Si Supabase está configurado, autenticar primero contra Supabase Auth
    if (isSupabaseConfigured) {
      try {
        const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (!supaError && supaData?.user) {
          let user = db.findUserByEmail(cleanEmail);
          if (!user) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            user = db.createUser({
              id: supaData.user.id,
              email: cleanEmail,
              passwordHash,
              name: supaData.user.user_metadata?.name || cleanEmail.split('@')[0],
              role: 'passenger', // ✅ Rol por defecto
              provider: 'email',
              avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
            });
          }
          try {
            db.pushActivity(`Inicio de sesión (Supabase Auth): ${user.name}`, 'info');
          } catch (_) {}

          const token = this.generateToken(user);
          const { passwordHash: _, ...safeUser } = user;
          return { user: safeUser, token };
        }
      } catch (err) {
        console.warn('[Supabase Auth] Fallo signInWithPassword, probando DB local:', err.message);
      }
    }

    // 2. Autenticación con la base de datos local
    const user = db.findUserByEmail(cleanEmail);
    // ⛔ Mensaje genérico para evitar enumeración de cuentas
    if (!user || !user.passwordHash) {
      throw new Error('Credenciales inválidas.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Credenciales inválidas.');
    }

    try {
      db.pushActivity(`Inicio de sesión: ${user.name}`, 'info');
    } catch (_) {}

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  // ⛔ Google y Apple OAuth eliminados — se usa exclusivamente Supabase Auth.
  // El flujo OAuth se maneja del lado del cliente con Supabase JS SDK.
  // El servidor recibe el callback via /api/v1/auth/oauth-callback.

}
