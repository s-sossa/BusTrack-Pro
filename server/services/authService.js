/* ==============================================================================
   BusTrack Pro — Authentication Service (Email, Google, Apple)
   ============================================================================== */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { db } from '../database/db.js';

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

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = db.createUser({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      role: 'admin', // default to admin for management app
      provider: 'email',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    });

    const token = this.generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser, token };
  }

  /** Login user with Email & Password */
  static async loginWithEmail({ email, password }) {
    if (!email || !password) {
      throw new Error('Correo y contraseña son requeridos.');
    }

    const user = db.findUserByEmail(email.toLowerCase().trim());
    if (!user || !user.passwordHash) {
      throw new Error('Credenciales inválidas o la cuenta utiliza inicio con Google/Apple.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Correo o contraseña incorrectos.');
    }

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
    }

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
    }

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }
}
