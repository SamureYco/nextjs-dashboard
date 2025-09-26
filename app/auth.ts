// auth.ts (en la raíz del repo)
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import authConfig from './auth.config';
import { z } from 'zod';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
    return user[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' }, // recomendado con Credentials
  providers: [
    Credentials({
      // (opcional) name: 'Credentials',
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await getUser(email);
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // Devuelve sólo lo necesario a la sesión (NO devuelvas password)
        return {
          id: String(user.id ?? user.email), // ajusta si tu User tiene 'id'
          name: user.name ?? user.email,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Cuando haces login, 'user' viene con lo que retornaste arriba
      if (user) {
        token.id = (user as any).id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Pasa campos del token a la session
      if (session.user) {
        (session.user as any).id = token.id;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
      }
      return session;
    },
    // Protege /dashboard desde middleware (ver abajo)
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith('/dashboard')) {
        return !!auth?.user; // exige login
      }
      return true;
    },
  },
});
