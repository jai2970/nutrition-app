This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment variables

Database (`.env`, see `prisma.config.ts`):

```
DATABASE_URL=<Postgres connection string>
GEMINI_API_KEY=<Gemini API key, for AI meal parsing>
```

Auth (`.env.local`):

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with `openssl rand -base64 32`>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

To get Google OAuth credentials: console.cloud.google.com → APIs & Services →
Credentials → Create Credentials → OAuth client ID → Web application. Add
both of these as authorized redirect URIs:

```
http://localhost:3000/api/auth/callback/google
https://nutrition-app-delta-tawny.vercel.app/api/auth/callback/google
```

For the deployed app, add the same four variables (with `NEXTAUTH_URL` set
to the production URL) in the Vercel dashboard under Settings → Environment
Variables.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
