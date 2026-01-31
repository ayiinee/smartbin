import React, { useState, useEffect } from "react";

const WASTE_OPTIONS = [
    "Plastic",
    "Residue",
    "Glass",
    "Metal",
];

export function DetectionResult({
    latestVisual,
    latestAudio,
    audioSummary,
    isAutoSaving,
    onConfirm,
    onCorrection
}) {
    const [showCorrection, setShowCorrection] = useState(false);
    const [selectedWaste, setSelectedWaste] = useState(WASTE_OPTIONS[0]);

    useEffect(() => {
        if (latestVisual && WASTE_OPTIONS.includes(latestVisual.label)) {
            setSelectedWaste(latestVisual.label);
        } else {
            setSelectedWaste(WASTE_OPTIONS[0]);
        }
        setShowCorrection(false);
    }, [latestVisual]);

    if (!latestVisual && !latestAudio) return null;

    return (
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
                <p className="mt-2 text-sm text-[#6B7280]">Video signature: {audioSummary}</p>
            ) : null}

            {!isAutoSaving ? (
                <div className="mt-5">
                    <p className="text-sm font-medium text-[#1F2937]">
                        Is this detection result correct?
                    </p>
                    {!showCorrection ? (
                        <div className="mt-3 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={onConfirm}
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
                                onChange={(event) => setSelectedWaste(event.target.value)}
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
                                onClick={() => onCorrection(selectedWaste)}
                                className="rounded-full border border-[#87CEEB] bg-[#EAF7FD] px-4 py-2 text-sm font-semibold text-[#2B7A93] transition hover:bg-[#D7F0FA]"
                            >
                                Save Correction
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-5 flex items-center gap-2 text-sm text-[#228B22]">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Auto-saving high accuracy result...</span>
                </div>
            )}
        </div>
    );
}
