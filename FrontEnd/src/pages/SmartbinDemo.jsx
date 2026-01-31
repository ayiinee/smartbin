import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const WASTE_OPTIONS = [
  "Plastic",
  "Metal",
  "Glass",
  "Paper",
  "Organic",
  "Residue",
  "Cardboard",
];

const DEFAULT_DETECTIONS = [
  {
    id: "boot",
    label: "System idle",
    confidence: 0.0,
    audio: "Silence",
    time: "--:--:--",
  },
];

export default function SmartbinDemo() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [visualFeed, setVisualFeed] = useState("Awaiting object");
  const [audioFeed, setAudioFeed] = useState("Silence");
  const [detected, setDetected] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [toast, setToast] = useState("");
  const [cycle, setCycle] = useState(0);
  const [selectedWaste, setSelectedWaste] = useState(WASTE_OPTIONS[0]);
  const [detections, setDetections] = useState(DEFAULT_DETECTIONS);

  useEffect(() => {
    let stream;

    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
      } catch (error) {
        setCameraError(
          "Camera access is blocked. Please allow webcam access to continue."
        );
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    setDetected(false);
    setShowCorrection(false);
    setVisualFeed("Awaiting object");
    setAudioFeed("Silence");

    const timer = setTimeout(() => {
      const timeLabel = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setDetected(true);
      setVisualFeed("Plastic bottle detected");
      setAudioFeed("Impact clang detected");

      setDetections((prev) => {
        const next = [
          {
            id: `${cycle}-detect`,
            label: "Plastic",
            confidence: 0.92,
            audio: "Clang",
            time: timeLabel,
          },
          ...prev.filter((item) => item.id !== "boot"),
        ];
        return next.slice(0, 4);
      });
    }, 2600);

    return () => clearTimeout(timer);
  }, [cycle]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleConfirm = () => {
    setToast("Prediction saved");
    setCycle((prev) => prev + 1);
  };

  const handleCorrection = () => {
    setToast("Correction saved");
    setCycle((prev) => prev + 1);
  };

  return (
    <div className="relative min-h-screen text-[#EAF6F0]">
      <div className="sb-stage sb-grid absolute inset-0 -z-10" />

      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        <button
          type="button"
          onClick={() => navigate("/demo-smartbin")}
          className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-[var(--sb-mint)]"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--sb-emerald)]" />
          SmartBin Live Demo
        </button>
        <div className="flex items-center gap-3 text-xs text-[var(--sb-stone)]">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Session: SB-01
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Status: Active
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="space-y-6">
            <div className="sb-card sb-glow relative overflow-hidden rounded-[28px]">
              <div className="absolute inset-x-0 top-0 h-24 sb-scanline" />
              <div className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-[var(--sb-mint)]">
                <span className="h-2 w-2 rounded-full bg-[var(--sb-emerald)]" />
                Mic live
              </div>
              <div className="absolute right-6 top-6 z-10 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-[var(--sb-stone)]">
                Vision feed
              </div>
              <div className="aspect-video w-full bg-[#0c1915]">
                {cameraReady ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#7b8c85]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-10 w-10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5V8a3 3 0 10-6 0v2.5m6 0a3 3 0 11-6 0m6 0h1.5a2.5 2.5 0 012.5 2.5v3A2.5 2.5 0 0119.5 18h-15A2.5 2.5 0 012 15.5v-3A2.5 2.5 0 014.5 10.5H6"
                      />
                    </svg>
                    <span className="text-sm">
                      {cameraError || "Camera feed loading..."}
                    </span>
                  </div>
                )}
              </div>
              <div className="grid gap-4 border-t border-white/5 bg-[#0a1411] px-6 py-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--sb-stone)]">
                    Visual Feed
                  </p>
                  <p className="font-display mt-2 text-lg text-[var(--sb-cloud)]">
                    {visualFeed}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--sb-stone)]">
                    Audio Feed
                  </p>
                  <p className="font-display mt-2 text-lg text-[var(--sb-cloud)]">
                    {audioFeed}
                  </p>
                </div>
              </div>
            </div>

            {detected && (
              <div className="fade-slide-in sb-panel rounded-[26px] p-6">
                <div className="flex items-center gap-3 text-[var(--sb-emerald)]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#11241b]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <h2 className="font-display text-lg">Detection confirmed</h2>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[var(--sb-stone)]">
                      Waste Type
                    </p>
                    <p className="font-display mt-2 text-xl text-[var(--sb-cloud)]">
                      Plastic bottle
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[var(--sb-stone)]">
                      Confidence
                    </p>
                    <p className="font-display mt-2 text-xl text-[var(--sb-cloud)]">
                      0.92
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[var(--sb-stone)]">
                      Carbon
                    </p>
                    <p className="font-display mt-2 text-xl text-[var(--sb-cloud)]">
                      +0.12 kg
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-sm text-[var(--sb-stone)]">
                    Is this detection result correct?
                  </p>
                  {!showCorrection ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleConfirm}
                        className="rounded-full border border-[var(--sb-emerald)] bg-[rgba(46,227,125,0.15)] px-4 py-2 text-sm font-semibold text-[var(--sb-mint)] transition hover:-translate-y-0.5"
                      >
                        Yes, correct
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCorrection(true)}
                        className="rounded-full border border-[var(--sb-copper)] px-4 py-2 text-sm font-semibold text-[var(--sb-copper)] transition hover:-translate-y-0.5"
                      >
                        Incorrect
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <label className="text-sm text-[var(--sb-stone)]">
                        Select the correct waste type:
                      </label>
                      <select
                        value={selectedWaste}
                        onChange={(event) => setSelectedWaste(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0b1512] px-3 py-2 text-sm text-[var(--sb-cloud)] focus:border-[var(--sb-sky)] focus:outline-none"
                      >
                        {WASTE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleCorrection}
                        className="rounded-full border border-[var(--sb-sky)] bg-[rgba(124,199,255,0.15)] px-4 py-2 text-sm font-semibold text-[var(--sb-sky)] transition hover:-translate-y-0.5"
                      >
                        Save correction
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="sb-panel rounded-[24px] p-5">
              <h2 className="font-display text-lg text-[var(--sb-mint)]">
                Live Detection Log
              </h2>
              <div className="mt-4 space-y-4 text-sm">
                {detections.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center justify-between text-xs text-[var(--sb-stone)]">
                      <span>{item.time}</span>
                      <span>{item.confidence ? `${item.confidence}` : "--"}</span>
                    </div>
                    <p className="font-display mt-2 text-base text-[var(--sb-cloud)]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-[var(--sb-stone)]">
                      Audio: {item.audio}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="sb-card rounded-[24px] p-5">
              <h2 className="font-display text-lg text-[var(--sb-mint)]">
                Sensor Pulse
              </h2>
              <div className="mt-4 grid grid-cols-10 items-end gap-2">
                {[
                  40, 60, 35, 80, 55, 70, 45, 65, 30, 50,
                  55, 35, 65, 45, 70, 30, 60, 42, 72, 38,
                ].map((height, index) => (
                  <div
                    key={index}
                    className="flex h-20 items-end rounded-full bg-[var(--sb-emerald)]/20"
                  >
                    <div
                      className="w-full animate-pulse rounded-full bg-[var(--sb-emerald)]/70"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-[var(--sb-stone)]">
                Audio intensity map (demo).
              </p>
            </div>

            <div className="sb-panel rounded-[24px] p-5">
              <h2 className="font-display text-lg text-[var(--sb-mint)]">
                System Snapshot
              </h2>
              <div className="mt-4 space-y-3 text-sm text-[var(--sb-stone)]">
                <div className="flex items-center justify-between">
                  <span>Visual model</span>
                  <span className="text-[var(--sb-cloud)]">garbage-2mxmf</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audio model</span>
                  <span className="text-[var(--sb-cloud)]">MFCC-40 v1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Carbon tracker</span>
                  <span className="text-[var(--sb-cloud)]">Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {toast && (
        <div className="float-up fixed right-6 top-6 z-20 rounded-full bg-[var(--sb-emerald)] px-4 py-2 text-sm font-semibold text-[#07130f] shadow-[0_12px_28px_rgba(46,227,125,0.45)]">
          {toast}
        </div>
      )}
    </div>
  );
}
