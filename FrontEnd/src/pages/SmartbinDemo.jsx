import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBinDetection } from "../hooks/useSmartBinDetection";
import { CameraFeed } from "../components/smartbin/CameraFeed";
import { DetectionResult } from "../components/smartbin/DetectionResult";
import { StatusPanel } from "../components/smartbin/StatusPanel";

export default function SmartbinDemo() {
  const navigate = useNavigate();
  const {
    videoRef,
    cameraReady,
    cameraError,
    annotatedImage,
    latestVisual,
    latestAudio,
    audioSummary,
    visualFeed,
    audioFeed,
    isAutoSaving,
    statusLabel,
    rmsLevel,
    threshold,
    setThreshold,
    effectiveThreshold,
    baselineRms,
    toast,
    setToast,
    resetDetection
  } = useSmartBinDetection();

  // Toast auto-hide handled here or in hook, here is fine for UI
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast, setToast]);

  const handleConfirm = () => {
    resetDetection("Data saved!");
  };

  const handleCorrection = (correctLabel) => {
    // In a real app, you might send correctLabel to backend here
    resetDetection("Correction saved!");
  };

  const detected = Boolean(latestVisual || latestAudio);

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
            <CameraFeed
              cameraReady={cameraReady}
              videoRef={videoRef}
              annotatedImage={annotatedImage}
              cameraError={cameraError}
            />

            {(detected) && (
              <DetectionResult
                latestVisual={latestVisual}
                latestAudio={latestAudio}
                audioSummary={audioSummary}
                isAutoSaving={isAutoSaving}
                onConfirm={handleConfirm}
                onCorrection={handleCorrection}
              />
            )}
          </div>

          <StatusPanel
            visualFeed={visualFeed}
            audioFeed={audioFeed || audioSummary}
            threshold={threshold}
            effectiveThreshold={effectiveThreshold}
            rmsLevel={rmsLevel}
            baselineRms={baselineRms}
            onThresholdChange={setThreshold}
            audioDebounceMs={3000}
          />
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
