# Next.js + Tailwind CSS + shadcn/ui Template

A modern, production-ready Next.js template with Tailwind CSS v4 and shadcn/ui pre-configured. Perfect for quickly starting new web applications with a solid foundation.

## Tech Stack

- **[Next.js 16](https://nextjs.org)** - React framework with App Router
- **[React 19](https://react.dev)** - Latest React with modern features
- **[Tailwind CSS v4](https://tailwindcss.com)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com)** - Re-usable components built with Radix UI
- **[TypeScript](https://www.typescriptlang.org)** - Type safety
- **[Phosphor Icons](https://phosphoricons.com)** - Beautiful icon library

## Features

- Latest Next.js 16 with App Router
- Tailwind CSS v4 with PostCSS
- shadcn/ui configured with "new-york" style
- Dark mode support with CSS variables
- Path aliases configured (`@/components`, `@/lib`, etc.)
- TypeScript for type safety
- ESLint configured
- Geist font family included

## Getting Started

### Using this Template

Click "Use this template" on GitHub or clone the repository:

```bash
git clone https://github.com/llmer/nextjs-tailwind-shadcn.git
cd nextjs-tailwind-shadcn
```

### Installation

Install dependencies using pnpm (recommended), npm, yarn, or bun:

```bash
pnpm install
# or
npm install
# or
yarn install
# or
bun install
```

### Development

Run the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Build

Create a production build:

```bash
pnpm build
# or
npm run build
```

## Adding shadcn/ui Components

This template is pre-configured with shadcn/ui. Add components using:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
# etc.
```

Components will be added to `components/ui/` automatically.

## Project Structure

```
.
├── app/                # Next.js App Router
│   ├── layout.tsx     # Root layout
│   ├── page.tsx       # Homepage
│   └── globals.css    # Global styles with Tailwind
├── components/         # React components (created when adding shadcn/ui)
├── lib/               # Utility functions
│   └── utils.ts       # cn() helper for class merging
├── public/            # Static assets
└── components.json    # shadcn/ui configuration
```

## Customization

### Theme

Modify theme colors in `app/globals.css` using CSS variables (lines 46-113).

### Fonts

The template uses Geist Sans and Geist Mono. Change fonts in `app/layout.tsx`.

### shadcn/ui Configuration

Configuration is in `components.json`. Modify settings like style, base color, and path aliases.

## Deploy

### Vercel (Recommended)

The easiest way to deploy is using [Vercel](https://vercel.com/new):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/llmer/nextjs-tailwind-shadcn)

### Other Platforms

This template works with any platform that supports Next.js:
- [Netlify](https://www.netlify.com)
- [Railway](https://railway.app)
- [Render](https://render.com)
- Self-hosted

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [React Documentation](https://react.dev)

## License

MIT - See [LICENSE.txt](LICENSE.txt) for details.

## Repository

[https://github.com/llmer/nextjs-tailwind-shadcn](https://github.com/llmer/nextjs-tailwind-shadcn)
