import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const WASTE_OPTIONS = [
  "Plastic Bottles",
  "Paper",
  "Cans",
  "Organic",
  "Residue",
  "Glass",
  "Cardboard",
];

export default function SmartbinDemo() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [visualFeed, setVisualFeed] = useState("Waiting for object...");
  const [audioFeed, setAudioFeed] = useState("Silence");
  const [detected, setDetected] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [toast, setToast] = useState("");
  const [cycle, setCycle] = useState(0);
  const [selectedWaste, setSelectedWaste] = useState(WASTE_OPTIONS[0]);

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
    setVisualFeed("Waiting for object...");
    setAudioFeed("Silence");

    const timer = setTimeout(() => {
      setDetected(true);
      setVisualFeed("Plastic bottle detected");
      setAudioFeed("“Clang” sound detected");
    }, 2800);

    return () => clearTimeout(timer);
  }, [cycle]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleConfirm = () => {
    setToast("Data saved!");
    setCycle((prev) => prev + 1);
  };

  const handleCorrection = () => {
    setToast("Correction saved!");
    setCycle((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5] text-[#333333]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(34,139,34,0.12),_rgba(245,247,245,0.95)_45%)]" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <button
          type="button"
          onClick={() => navigate("/demo-smartbin")}
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.26em] text-[#228B22]"
        >
          SmartBin Demo
        </button>
        <div className="text-xs text-[#6B7280]">Live monitoring</div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <div className="relative overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#228B22] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#228B22]" />
                Mic On
              </div>

              <div className="aspect-video w-full bg-[#F1F5F9]">
                {cameraReady ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#94A3B8]">
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
            </div>

            {detected && (
              <div className="fade-slide-in mt-5 rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#228B22] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 text-[#228B22]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E7F6E7]">
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
                  <h2 className="text-lg font-semibold">
                    Detection Successful!
                  </h2>
                </div>

                <p className="mt-4 text-sm uppercase tracking-[0.2em] text-[#6B7280]">
                  Waste Type
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-[#1F2937]">
                  Plastic Bottle
                </h3>

                <div className="mt-5">
                  <p className="text-sm font-medium text-[#1F2937]">
                    Is this detection result correct?
                  </p>
                  {!showCorrection ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleConfirm}
                        className="rounded-full border border-[#228B22] bg-[#E7F6E7] px-4 py-2 text-sm font-semibold text-[#228B22] transition hover:bg-[#D8F0D8]"
                      >
                        Yes, Correct
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCorrection(true)}
                        className="rounded-full border border-[#8B3A3A] px-4 py-2 text-sm font-semibold text-[#8B3A3A] transition hover:bg-[#F9EAEA]"
                      >
                        Incorrect
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <label className="text-sm font-medium text-[#1F2937]">
                        Select the correct type of waste:
                      </label>
                      <select
                        value={selectedWaste}
                        onChange={(event) =>
                          setSelectedWaste(event.target.value)
                        }
                        className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1F2937] shadow-sm focus:border-[#87CEEB] focus:outline-none"
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
                        className="rounded-full border border-[#87CEEB] bg-[#EAF7FD] px-4 py-2 text-sm font-semibold text-[#2B7A93] transition hover:bg-[#D7F0FA]"
                      >
                        Save Correction
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#228B22]">
              Detection Status
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3 border-b border-[#F1F5F9] pb-3">
                <span className="font-medium text-[#475569]">Visual Feed:</span>
                <span className="text-right font-mono text-[#1F2937]">
                  {visualFeed}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium text-[#475569]">Audio Feed:</span>
                <span className="text-right font-mono text-[#1F2937]">
                  {audioFeed}
                </span>
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-[#F5F7F5] p-4 text-xs text-[#64748B]">
              System status updates in real time as the model detects waste.
            </div>
          </div>
        </section>
      </main>

      {toast && (
        <div className="fixed right-6 top-6 z-20 rounded-full bg-[#228B22] px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
