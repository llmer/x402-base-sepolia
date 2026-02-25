export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-12 px-6 py-32">
        <div className="flex flex-col gap-3">
          <h1 className="text-5xl font-medium tracking-tight text-black dark:text-white">
            LLMer
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Building things on the internet.
          </p>
        </div>

        <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />

        <div className="flex flex-col gap-4 text-sm">
          <p className="text-zinc-600 dark:text-zinc-400">
            A Next.js starter with Tailwind CSS v4 and shadcn/ui. Batteries included, opinions minimal.
          </p>
          <p className="text-zinc-500 dark:text-zinc-500">
            Start building.
          </p>
        </div>
      </main>
    </div>
  );
}
