import React from "react";

export function StatusPanel({
    visualFeed,
    audioFeed,
    threshold,
    effectiveThreshold,
    rmsLevel,
    baselineRms,
    onThresholdChange,
    audioDebounceMs
}) {
    return (
        <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#228B22]">Detection Status</h2>
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
            <div className="mt-6 rounded-2xl border border-[#E2E8F0] bg-white p-4 text-xs text-[#475569]">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1F2937]">Audio Trigger</span>
                    <span className="text-[#6B7280]">
                        Threshold {threshold.toFixed(2)} | Effective{" "}
                        {effectiveThreshold.toFixed(2)}
                    </span>
                </div>
                <input
                    type="range"
                    min="0.05"
                    max="0.9"
                    step="0.01"
                    value={threshold}
                    onChange={(event) => onThresholdChange(Number(event.target.value))}
                    className="mt-3 w-full"
                />
                <div className="mt-3 h-2 w-full rounded-full bg-[#E2E8F0]">
                    <div
                        className="h-2 rounded-full bg-[#228B22]"
                        style={{ width: `${Math.min(100, (rmsLevel / 0.9) * 100)}%` }}
                    />
                </div>
                <div className="mt-2 text-[11px] text-[#6B7280]">
                    RMS: {rmsLevel.toFixed(3)} | Baseline {baselineRms.toFixed(3)} |
                    Debounce {audioDebounceMs}ms
                </div>
            </div>
        </div>
    );
}
