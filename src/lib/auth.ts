import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { checkRateLimit } from "@/lib/rate-limiter"
import { getClientIp } from "@/lib/ip"

const trustHost = process.env.NODE_ENV === "development" || !!process.env.NEXTAUTH_URL

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      username?: string | null
      role: string
    }
  }

  interface User {
    username?: string | null
    role?: string
    passwordChangedAt?: string
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        try {
          const { email, password } = credentials as {
            email: string
            password: string
          }
          if (!email || !password) return null

          // ponytail: per-IP rate limit, per-account Redis if this gets traffic
          const ip = getClientIp(request)
          if (!checkRateLimit(`login:${ip}`, 5, 60_000)) {
            console.warn(`[authorize] rate limit exceeded for ip=${ip}`)
            return null
          }

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1)

          if (!user) return null

          const isValid = await compare(password, user.passwordHash)
          if (!isValid) return null

          return { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role, passwordChangedAt: user.passwordChangedAt }
        } catch (err) {
          console.error("[authorize] error:", err)
          return null
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
        token.passwordChangedAt = user.passwordChangedAt
      }

      // invalidate session if password was changed after token was issued
      if (trigger !== "signIn" && token.id) {
        return db
          .select({ passwordChangedAt: users.passwordChangedAt })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1)
          .then(([dbUser]) => {
            if (!dbUser || dbUser.passwordChangedAt !== token.passwordChangedAt) return null
            return token
          })
          .catch(() => null)
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string | undefined
        session.user.role = (token.role as string) || "user"
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost,
})
