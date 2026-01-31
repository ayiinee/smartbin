import { useNavigate } from "react-router-dom";

export default function SmartbinDemoTest() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen text-[#EAF6F0]">
      <div className="sb-stage sb-grid absolute inset-0 -z-10" />
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[var(--sb-emerald)] shadow-[0_0_12px_rgba(46,227,125,0.8)]" />
            <span className="font-display text-xs uppercase tracking-[0.4em] text-[var(--sb-mint)]">
              SmartBin AI
            </span>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-[var(--sb-stone)]">
            Demo access ? Multimodal intelligence
          </div>
        </header>

        <section className="mt-14 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <div className="sb-card sb-glow rounded-[28px] p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--sb-stone)]">
                Intelligent waste monitoring
              </p>
              <h1 className="font-display mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                SmartBin AI Demo Interface
              </h1>
              <p className="mt-4 max-w-xl text-base text-[var(--sb-stone)] sm:text-lg">
                Experience how visual and audio intelligence classify waste in
                seconds, then capture the correction loop for continuous
                learning.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/demo-smartbin/live")}
                  className="rounded-full bg-[var(--sb-emerald)] px-6 py-3 text-sm font-semibold text-[#07130f] shadow-[0_12px_28px_rgba(46,227,125,0.35)] transition hover:-translate-y-0.5"
                >
                  Launch Live Demo
                </button>
                <span className="text-sm text-[var(--sb-stone)]">
                  Webcam + microphone required
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Visual Signal",
                  desc: "Roboflow object detection for plastic, metal, glass, residue.",
                  tone: "border-[var(--sb-sky)]/40",
                },
                {
                  title: "Audio Signal",
                  desc: "MFCC audio fingerprinting for material impact sounds.",
                  tone: "border-[var(--sb-emerald)]/40",
                },
                {
                  title: "Carbon Lens",
                  desc: "Live footprint estimation for greenhouse mitigation.",
                  tone: "border-[var(--sb-copper)]/40",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className={`sb-panel rounded-2xl border ${item.tone} p-5 text-sm text-[var(--sb-cloud)]`}
                >
                  <h3 className="font-display text-base">{item.title}</h3>
                  <p className="mt-2 text-xs text-[var(--sb-stone)]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="sb-panel rounded-[26px] p-6">
              <h2 className="font-display text-lg text-[var(--sb-mint)]">
                Demo Flow
              </h2>
              <ol className="mt-4 space-y-4 text-sm text-[var(--sb-stone)]">
                {[
                  "Enable camera and microphone.",
                  "Drop waste into the bin.",
                  "Verify prediction and submit correction.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs text-[var(--sb-mint)]">
                      0{index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-[var(--sb-stone)]">
                Tip: Keep lighting stable for the clearest visual detection.
              </div>
            </div>

            <div className="sb-card rounded-[26px] p-6">
              <h2 className="font-display text-lg text-[var(--sb-mint)]">
                Real-time Metrics
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Latency", value: "1.6s", unit: "avg" },
                  { label: "Confidence", value: "92%", unit: "median" },
                  { label: "Audio Frames", value: "40", unit: "mfcc" },
                  { label: "CO2 Saved", value: "3.2kg", unit: "demo" },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-[var(--sb-stone)]">
                      {metric.label}
                    </p>
                    <p className="font-display mt-2 text-2xl text-[var(--sb-cloud)]">
                      {metric.value}
                      <span className="ml-2 text-xs font-normal text-[var(--sb-stone)]">
                        {metric.unit}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

