import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

const trustHost = process.env.NODE_ENV === "development" || !!process.env.NEXTAUTH_URL

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
    }
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
      async authorize(credentials) {
        try {
          const { email, password } = credentials as {
            email: string
            password: string
          }
          if (!email || !password) return null

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1)

          if (!user) return null

          const isValid = await compare(password, user.passwordHash)
          if (!isValid) return null

          return { id: user.id, email: user.email, name: user.name }
        } catch {
          return null
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost,
})
