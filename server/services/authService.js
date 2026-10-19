import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '../supabase.js';

const INVALID_CREDENTIALS = 'Correo o contraseña inválidos, intentelo de nuevo';
const avatarFor = (seed) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;

export class AuthService {
  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, provider: user.provider },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static async loadProfile(authUser) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('full_name, role, avatar_url, auth_provider')
      .eq('id', authUser.id)
      .maybeSingle();
    if (error) throw new Error('No se pudo leer el perfil del usuario.');

    const name = data?.full_name || authUser.user_metadata?.full_name || authUser.email.split('@')[0];
    return {
      id: authUser.id,
      email: authUser.email,
      name,
      role: data?.role || 'passenger',
      provider: data?.auth_provider || 'email',
      avatarUrl: data?.avatar_url || avatarFor(name),
    };
  }

  static async registerWithEmail({ email, password, name, consentTerms, consentPrivacy }) {
    if (!consentTerms) throw new Error('Debes aceptar los Términos y Condiciones para registrarte.');
    if (consentPrivacy !== true) throw new Error('Debes aceptar la Política de Privacidad para registrarte.');
    if (!email || !password || !name) throw new Error('Todos los campos son obligatorios.');
    if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    if (!isSupabaseConfigured) throw new Error('El servicio de cuentas no está configurado.');

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: cleanName } },
    });
    if (error) {
      if (/already registered/i.test(error.message)) {
        throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
      }
      throw new Error(error.message);
    }
    if (!data.user) throw new Error('No se pudo crear la cuenta.');

    if (!data.session) {
      return { user: null, token: null, pendingConfirmation: true };
    }
    const user = await this.loadProfile(data.user);
    return { user, token: this.generateToken(user) };
  }

  static async loginWithEmail({ email, password }) {
    if (!email || !password) throw new Error(INVALID_CREDENTIALS);
    if (!isSupabaseConfigured) throw new Error('El servicio de cuentas no está configurado.');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (error || !data.user) throw new Error(INVALID_CREDENTIALS);

    const user = await this.loadProfile(data.user);
    return { user, token: this.generateToken(user) };
  }

  static async loginWithOAuthCallback(accessToken) {
    if (!accessToken) throw new Error('Falta el token de sesión.');
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) throw new Error('Sesión de proveedor inválida.');

    const user = await this.loadProfile(data.user);
    return { user, token: this.generateToken(user) };
  }
}
