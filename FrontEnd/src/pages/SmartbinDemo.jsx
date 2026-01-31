import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBinDetection } from "../hooks/useSmartBinDetection";
import { CameraFeed } from "../components/smartbin/CameraFeed";
import { DetectionResult } from "../components/smartbin/DetectionResult";
import { StatusPanel } from "../components/smartbin/StatusPanel";
import { submitCrowdValidation } from "../services/validationApi";

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

  const sendCrowdValidation = async (crowdLabel) => {
    const aiLabel = latestVisual?.label || latestAudio?.label || "Unknown";
    const aiConfidence = latestVisual?.confidence || latestAudio?.confidence || 0;
    setToast("Sending to AI validation...");

    try {
      await submitCrowdValidation({
        image_base64: annotatedImage,
        ai_label: aiLabel,
        ai_confidence: aiConfidence,
        audio_label: latestAudio?.label || "",
        audio_confidence: latestAudio?.confidence || 0,
        crowd_label: crowdLabel || aiLabel,
      });
      resetDetection("Sent to AI validation queue!");
    } catch (error) {
      console.error("Crowd validation submit failed:", error);
      setToast("Failed to send validation data.");
    }
  };

  const handleConfirm = () => {
    sendCrowdValidation(latestVisual?.label || latestAudio?.label || "Unknown");
  };

  const handleCorrection = (correctLabel) => {
    sendCrowdValidation(correctLabel);
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
        <div className="flex items-center gap-4 text-xs text-[#6B7280]">
          <button
            type="button"
            onClick={() => navigate("/ai-validation")}
            className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-[11px] font-semibold text-[#475569] transition hover:border-[#C1D9C5] hover:text-[#1F2937]"
          >
            Open AI Validation
          </button>
          <span>Status: {statusLabel}</span>
        </div>
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
