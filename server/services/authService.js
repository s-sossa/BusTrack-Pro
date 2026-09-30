/* ==============================================================================
   BusTrack Pro — Authentication Service (Email, Google, Apple)
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

    // 1. Verificar si ya existe en la base de datos local primero
    const existingUser = db.findUserByEmail(cleanEmail);
    if (existingUser) {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
    }

    // 2. Si Supabase está configurado, registrar en Supabase Auth y tabla users de Supabase (si existe)
    if (isSupabaseConfigured) {
      try {
        const { data: supaData, error: supaError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { name: name.trim() },
          },
        });

        if (supaError && !supaError.message.includes('User already registered')) {
          console.warn('[Supabase Auth] Registro aviso:', supaError.message);
        }
      } catch (err) {
        console.warn('[Supabase Auth] Error de conexión:', err.message);
      }

      try {
        await supabase.from('users').upsert({
          email: cleanEmail,
          full_name: name.trim(),
          role: 'admin',
          auth_provider: 'email',
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
        });
      } catch (_) {
        // Ignorar de forma segura si la tabla no existe en Supabase REST API
      }
    }

    // 3. Guardar en la base de datos local para persistencia rápida y segura
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = db.createUser({
      email: cleanEmail,
      passwordHash,
      name: name.trim(),
      role: 'admin',
      provider: 'email',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
    });

    try {
      db.pushActivity(`Nuevo usuario registrado: ${name.trim()} (${cleanEmail})`, 'info');
    } catch (_) {}

    const token = this.generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser, token };
  }

  /** Login user with Email & Password */
  static async loginWithEmail({ email, password }) {
    if (!email || !password) {
      throw new Error('Correo y contraseña son requeridos.');
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Si Supabase está configurado, intentar primero autenticar contra Supabase Auth
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
              role: 'admin',
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
    if (!user || !user.passwordHash) {
      throw new Error('Credenciales inválidas o la cuenta fue creada con Google/Apple.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    try {
      db.pushActivity(`Inicio de sesión: ${user.name} (${user.email})`, 'info');
    } catch (_) {}

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  /** Login / Register with Google OAuth */
  static async loginWithGoogle({ googleToken, email, name, picture }) {
    if (!email) {
      throw new Error('No se pudo verificar el correo de Google.');
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = db.findUserByEmail(cleanEmail);

    if (!user) {
      user = db.createUser({
        email: cleanEmail,
        passwordHash: null,
        name: name || cleanEmail.split('@')[0],
        role: 'admin',
        provider: 'google',
        avatarUrl: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
      });

      if (isSupabaseConfigured) {
        try {
          await supabase.from('users').upsert({
            email: cleanEmail,
            full_name: user.name,
            role: 'admin',
            auth_provider: 'google',
            avatar_url: user.avatarUrl,
          });
        } catch (_) {}
      }
    }

    try {
      db.pushActivity(`Inicio de sesión con Google: ${user.name}`, 'info');
    } catch (_) {}

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  /** Login / Register with Apple OAuth */
  static async loginWithApple({ appleToken, email, name }) {
    const cleanEmail = (email || `apple_${Date.now()}@privaterelay.appleid.com`).toLowerCase().trim();
    let user = db.findUserByEmail(cleanEmail);

    if (!user) {
      user = db.createUser({
        email: cleanEmail,
        passwordHash: null,
        name: name || 'Usuario Apple',
        role: 'passenger',
        provider: 'apple',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=Apple`,
      });

      if (isSupabaseConfigured) {
        try {
          await supabase.from('users').upsert({
            email: cleanEmail,
            full_name: user.name,
            role: 'passenger',
            auth_provider: 'apple',
            avatar_url: user.avatarUrl,
          });
        } catch (_) {}
      }
    }

    try {
      db.pushActivity(`Inicio de sesión con Apple: ${user.name}`, 'info');
    } catch (_) {}

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }
}

