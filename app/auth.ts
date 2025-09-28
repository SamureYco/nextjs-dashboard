// app/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "./auth.config";
import { z } from "zod";
import type { User as AppUser } from "@/app/lib/definitions";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import bcrypt from "bcrypt";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

async function getUser(email: string): Promise<AppUser | undefined> {
  try {
    const users = await sql<AppUser[]>`SELECT * FROM users WHERE email=${email}`;
    return users[0];
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await getUser(email);
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // Devuelve solo los campos necesarios
        return {
          id: String(user.id ?? user.email),
          name: user.name ?? user.email,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      // user existe solo al iniciar sesión
      if (user) {
        // `JWT` y `Session` fueron extendidos en next-auth.d.ts (ya no usamos `any`)
        token.id = typeof (user as { id?: unknown }).id !== "undefined"
          ? String((user as { id?: unknown }).id)
          : token.id;
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
      }
      return token;
    },
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.email === "string") session.user.email = token.email;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/dashboard")) {
        return !!auth?.user; // exige login
      }
      return true;
    },
  },
});
