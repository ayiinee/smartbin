import { useNavigate } from "react-router-dom";

export default function SmartbinDemoTest() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F7F5] text-[#333333]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(135,206,235,0.25),_rgba(245,247,245,0.9)_45%)]" />
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-14">
        <header className="flex items-center justify-between">
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-[#228B22]">
            SmartBin
          </div>
          <div className="text-xs text-[#6B7280]">Demo access</div>
        </header>

        <section className="mt-16 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">
              Intelligent waste detection
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-[#1F2937] sm:text-5xl">
              SmartBin Demo Experience
            </h1>
            <p className="mt-4 max-w-xl text-base text-[#4B5563] sm:text-lg">
              Launch the live monitoring view to preview how SmartBin detects
              waste using visual and audio signals in real time.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/demo-smartbin/live")}
                className="rounded-full bg-[#228B22] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B6E1B]"
              >
                Start Demo
              </button>
              <span className="text-sm text-[#6B7280]">
                Webcam + microphone required
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1F2937]">
              What you will see
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-[#4B5563]">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#228B22]" />
                Live camera feed with ambient audio monitoring.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#87CEEB]" />
                Real-time detection log for visual and audio signals.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#228B22]" />
                Results panel with validation and correction workflow.
              </li>
            </ul>
            <div className="mt-6 rounded-2xl bg-[#F5F7F5] p-4 text-xs text-[#6B7280]">
              Tip: Click "Start Demo" to begin a simulated detection cycle.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
