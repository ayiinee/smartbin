import { useEffect, useMemo, useRef, useState } from "react";
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const DEBOUNCE_MS = 3000;
const AUDIO_CAPTURE_MS = 2000;

export default function SmartbinDemo() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCaptureInProgress = useRef(false);
  const isDetectingRef = useRef(false);
  const lastTriggerRef = useRef(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [visualFeed, setVisualFeed] = useState("Waiting for object...");
  const [audioFeed, setAudioFeed] = useState("Listening...");
  const [latestVisual, setLatestVisual] = useState(null);
  const [latestAudio, setLatestAudio] = useState(null);
  const [annotatedImage, setAnnotatedImage] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedWaste, setSelectedWaste] = useState(WASTE_OPTIONS[0]);
  const [rmsLevel, setRmsLevel] = useState(0);
  const [threshold, setThreshold] = useState(0.4);
  const [statusLabel, setStatusLabel] = useState("MONITORING");

  const detected = Boolean(latestVisual);
  const audioSummary = useMemo(() => {
    if (!latestAudio) return "Silence";
    const confidence = Math.round(latestAudio.confidence * 100);
    return `${latestAudio.label} (${confidence}%)`;
  }, [latestAudio]);

  useEffect(() => {
    let stream;

    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
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
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    setShowCorrection(false);
    setVisualFeed("Waiting for object...");
    setAudioFeed("Listening...");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!latestVisual) return;
    setShowCorrection(false);
    if (WASTE_OPTIONS.includes(latestVisual.label)) {
      setSelectedWaste(latestVisual.label);
    } else {
      setSelectedWaste(WASTE_OPTIONS[0]);
    }
  }, [latestVisual]);

  const encodeWav = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, value) => {
      for (let i = 0; i < value.length; i += 1) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  };

  const recordAudioSnippet = async () => {
    if (!streamRef.current || audioCaptureInProgress.current) return null;
    audioCaptureInProgress.current = true;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(streamRef.current);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    const chunks = [];

    processor.onaudioprocess = (event) => {
      const data = event.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(data));
    };

    source.connect(processor);
    processor.connect(gain);
    gain.connect(audioContext.destination);

    await audioContext.resume();

    return new Promise((resolve) => {
      setTimeout(() => {
        processor.disconnect();
        gain.disconnect();
        source.disconnect();
        processor.onaudioprocess = null;

        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const samples = new Float32Array(totalLength);
        let offset = 0;
        chunks.forEach((chunk) => {
          samples.set(chunk, offset);
          offset += chunk.length;
        });

        const wavBlob = encodeWav(samples, audioContext.sampleRate);
        audioContext.close();
        resolve(wavBlob);
      }, AUDIO_CAPTURE_MS);
    }).finally(() => {
      audioCaptureInProgress.current = false;
    });
  };

  const captureImageBlob = async () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.85
      );
    });
  };

  const runDetection = async () => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;
    setStatusLabel("DETECTING...");
    setVisualFeed("Detecting...");
    setAudioFeed("Recording...");

    try {
      const [imageBlob, audioBlob] = await Promise.all([
        captureImageBlob(),
        recordAudioSnippet(),
      ]);

      if (!imageBlob && !audioBlob) {
        setStatusLabel("MONITORING");
        return;
      }

      const formData = new FormData();
      if (imageBlob) formData.append("image", imageBlob, "frame.jpg");
      if (audioBlob) formData.append("audio", audioBlob, "sample.wav");

      const response = await fetch(`${API_BASE_URL}/api/predict/multimodal`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const payload = await response.json();
      if (payload?.error) {
        throw new Error(payload.error);
      }

      const visual = payload.visual || {};
      const audio = payload.audio || {};

      if (payload?.annotated_image) {
        const raw = payload.annotated_image;
        const imageUrl = raw.startsWith("data:")
          ? raw
          : `data:image/jpeg;base64,${raw}`;
        setAnnotatedImage(imageUrl);
      } else {
        setAnnotatedImage("");
      }

      if (visual?.label) {
        setLatestVisual({
          label: visual.label,
          confidence: visual.confidence || 0,
        });
        setVisualFeed(`${visual.label} (${Math.round((visual.confidence || 0) * 100)}%)`);
      } else {
        setLatestVisual(null);
        setVisualFeed("No object detected");
      }

      if (audio?.label) {
        setLatestAudio({
          label: audio.label,
          confidence: audio.confidence || 0,
        });
        setAudioFeed(`${audio.label} (${Math.round((audio.confidence || 0) * 100)}%)`);
      } else {
        setLatestAudio(null);
        setAudioFeed("No sound detected");
      }

      setStatusLabel("MONITORING");
    } catch (error) {
      setStatusLabel("ERROR");
      setVisualFeed("Detection failed");
      setAudioFeed("Detection failed");
    } finally {
      isDetectingRef.current = false;
    }
  };

  useEffect(() => {
    if (!cameraReady || !streamRef.current) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(streamRef.current);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    const computeRms = () => {
      const buffer = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buffer);
      let sumSq = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const v = (buffer[i] - 128) / 128;
        sumSq += v * v;
      }
      return Math.sqrt(sumSq / buffer.length);
    };

    const loop = () => {
      const rms = computeRms();
      setRmsLevel(rms);

      const now = performance.now();
      if (
        !isDetectingRef.current &&
        rms >= threshold &&
        now - lastTriggerRef.current > DEBOUNCE_MS
      ) {
        lastTriggerRef.current = now;
        runDetection();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      analyserRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [cameraReady, threshold]);

  const handleConfirm = () => {
    setToast("Data saved!");
    setLatestVisual(null);
    setLatestAudio(null);
    setAnnotatedImage("");
  };

  const handleCorrection = () => {
    setToast("Correction saved!");
    setLatestVisual(null);
    setLatestAudio(null);
    setAnnotatedImage("");
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
        <div className="text-xs text-[#6B7280]">Status: {statusLabel}</div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <div className="relative overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#228B22] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#228B22]" />
                Mic On
              </div>

              <div className="relative aspect-video w-full bg-[#F1F5F9]">
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
                {cameraReady && annotatedImage ? (
                  <img
                    src={annotatedImage}
                    alt="Annotated detection"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
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
                  <h2 className="text-lg font-semibold">Detection Successful!</h2>
                </div>

                <p className="mt-4 text-sm uppercase tracking-[0.2em] text-[#6B7280]">
                  Waste Type
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-[#1F2937]">
                  {latestVisual?.label || "Unknown"}
                </h3>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Confidence: {Math.round((latestVisual?.confidence || 0) * 100)}%
                </p>
                {latestAudio ? (
                  <p className="mt-2 text-sm text-[#6B7280]">
                    Audio signature: {audioSummary}
                  </p>
                ) : null}

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
                  {audioFeed || audioSummary}
                </span>
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-[#F5F7F5] p-4 text-xs text-[#64748B]">
              System status updates in real time as the model detects waste.
            </div>
            <div className="mt-6 rounded-2xl border border-[#E2E8F0] bg-white p-4 text-xs text-[#475569]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1F2937]">Audio Trigger</span>
                <span className="text-[#6B7280]">Threshold {threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.9"
                step="0.01"
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                className="mt-3 w-full"
              />
              <div className="mt-3 h-2 w-full rounded-full bg-[#E2E8F0]">
                <div
                  className="h-2 rounded-full bg-[#228B22]"
                  style={{ width: `${Math.min(100, (rmsLevel / 0.9) * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-[#6B7280]">
                RMS: {rmsLevel.toFixed(3)} • Debounce {DEBOUNCE_MS}ms
              </div>
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
