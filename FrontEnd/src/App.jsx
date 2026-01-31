export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          SmartBin Dashboard
        </h1>
        <p className="text-lg text-slate-300">
          React + TailwindCSS are ready. Start building your UI in{" "}
          <span className="font-medium text-slate-100">App.jsx</span>.
        </p>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Next steps
          </p>
          <ul className="mt-4 space-y-2 text-slate-200">
            <li>Run: npm run dev</li>
            <li>Edit: src/App.jsx</li>
            <li>Add components: src/components</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
