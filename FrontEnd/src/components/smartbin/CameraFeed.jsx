import React from "react";

export function CameraFeed({
    cameraReady,
    videoRef,
    annotatedImage,
    cameraError
}) {
    return (
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
    );
}
