// auth.config.ts
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const authConfig: NextAuthConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },

  // Protecciones de ruta (puedes dejar tal cual)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) return isLoggedIn;
      if (isLoggedIn && nextUrl.pathname === '/login') {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },

  // Provider de credenciales (necesario para signIn)
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // TODO: reemplaza por tu verificación real en DB
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (email === 'user@nextmail.com' && password === '123456') {
          return { id: '1', name: 'Demo User', email };
        }
        return null;
      },
    }),
  ],
};

export default authConfig;
