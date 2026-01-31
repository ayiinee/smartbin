import { useState, useEffect, useRef, useMemo, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const AUDIO_DEBOUNCE_MS = 3000;
const VISUAL_POLL_MS = 2500;
const BASELINE_SAMPLE_COUNT = 120;
const BASELINE_MULTIPLIER = 2.5;
const AUTO_SAVE_THRESHOLD = 0.70; // 70% Confidence for auto-save

export function useSmartBinDetection() {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);
    const isDetectingRef = useRef(false);
    const lastAudioTriggerRef = useRef(0);
    const lastVisualTriggerRef = useRef(0);
    const baselineSumRef = useRef(0);
    const baselineCountRef = useRef(0);
    const baselineReadyRef = useRef(false);
    const baselineRmsRef = useRef(0);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const rafRef = useRef(null);
    const audioChunksRef = useRef([]);

    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [visualFeed, setVisualFeed] = useState("Waiting for object...");
    const [audioFeed, setAudioFeed] = useState("Listening...");
    const [latestVisual, setLatestVisual] = useState(null);
    const [latestAudio, setLatestAudio] = useState(null);
    const [annotatedImage, setAnnotatedImage] = useState("");
    const [toast, setToast] = useState("");
    const [rmsLevel, setRmsLevel] = useState(0);
    const [threshold, setThreshold] = useState(0.1);
    const [baselineRms, setBaselineRms] = useState(0);
    const [statusLabel, setStatusLabel] = useState("MONITORING");
    const [isMonitoring, setIsMonitoring] = useState(true);

    // New States for Logic
    const [isFrozen, setIsFrozen] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);

    // Derived state
    const detected = Boolean(latestVisual);
    const effectiveThreshold = useMemo(
        () => Math.max(threshold, baselineRms * BASELINE_MULTIPLIER),
        [baselineRms, threshold]
    );

    const audioSummary = useMemo(() => {
        if (!latestAudio) return "Silence";
        const confidence = Math.round(latestAudio.confidence * 100);
        return `${latestAudio.label} (${confidence}%)`;
    }, [latestAudio]);

    // --- Reset / Continue Helper ---
    const resetDetection = useCallback((message = "") => {
        if (message) setToast(message);
        setLatestVisual(null);
        setLatestAudio(null);
        setAnnotatedImage("");
        setIsFrozen(false);
        setIsAutoSaving(false);
        setStatusLabel("MONITORING");
    }, []);

    // --- Helpers for Audio/Image processing ---
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

        const pcmData = new Int16Array(buffer, 44, samples.length);
        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        return new Blob([buffer], { type: "audio/wav" });
    };

    const captureImageBlob = async () => {
        if (!videoRef.current) return null;
        const video = videoRef.current;
        if (!video.videoWidth || !video.videoHeight) return null;

        let canvas = canvasRef.current;
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvasRef.current = canvas;
        }

        const MAX_WIDTH = 640;
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
        const width = Math.round(video.videoWidth * scale);
        const height = Math.round(video.videoHeight * scale);

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, width, height);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.80);
        });
    };

    const blobToDataUrl = (blob) =>
        new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });

    // --- Main Detection Logic ---
    const runDetection = useCallback(async ({ includeAudio = false } = {}) => {
        if (isDetectingRef.current) return;
        isDetectingRef.current = true;
        setStatusLabel("DETECTING...");
        setVisualFeed("Detecting...");
        if (includeAudio) {
            setAudioFeed("Recording...");
        }

        try {
            const imageBlob = await captureImageBlob();

            let audioBlob = null;
            if (includeAudio && audioChunksRef.current.length > 0 && audioContextRef.current) {
                const chunks = audioChunksRef.current.slice(-30);
                const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
                const samples = new Float32Array(totalLen);
                let offset = 0;
                chunks.forEach((c) => {
                    samples.set(c, offset);
                    offset += c.length;
                });
                audioBlob = encodeWav(samples, audioContextRef.current.sampleRate);
            }

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
            if (payload?.error) throw new Error(payload.error);

            const visual = payload.visual || {};
            const audio = payload.audio || {};
            const visualError = payload?.errors?.visual;
            const audioError = payload?.errors?.audio;
            const confidence = payload.confidence_score || 0;

            // Update Annotation
            if (payload?.annotated_image) {
                const raw = payload.annotated_image;
                const imageUrl = raw.startsWith("data:") ? raw : `data:image/jpeg;base64,${raw}`;
                setAnnotatedImage(imageUrl);
            } else if (imageBlob) {
                const fallbackUrl = await blobToDataUrl(imageBlob);
                if (typeof fallbackUrl === "string") setAnnotatedImage(fallbackUrl);
            } else {
                setAnnotatedImage("");
            }

            // Update Visual Result State
            if (visualError) {
                setLatestVisual(null);
                setVisualFeed(`Visual error: ${visualError}`);
            } else if (visual?.label) {
                setLatestVisual({
                    label: visual.label,
                    confidence: visual.confidence || 0,
                });
                setVisualFeed(`${visual.label} (${Math.round((visual.confidence || 0) * 100)}%)`);
            } else {
                setLatestVisual(null);
                setVisualFeed("No object detected");
            }

            // Update Audio Result State
            if (includeAudio) {
                if (audioError) {
                    setLatestAudio(null);
                    setAudioFeed(`Audio error: ${audioError}`);
                } else if (audio?.label) {
                    setLatestAudio({
                        label: audio.label,
                        confidence: audio.confidence || 0,
                    });
                    setAudioFeed(`${audio.label} (${Math.round((audio.confidence || 0) * 100)}%)`);
                } else {
                    setLatestAudio(null);
                    setAudioFeed("No sound detected");
                }
            }

            // Decisions: Freeze, Auto-save or Wait
            const hasDetection = (visual?.label && visual.label !== "none") || (audio?.label && audio.label !== "none");

            if (hasDetection) {
                setIsFrozen(true);
                if (confidence >= AUTO_SAVE_THRESHOLD) {
                    setIsAutoSaving(true);
                    setStatusLabel("AUTO-SAVING...");
                    setToast(`High confidence (${Math.round(confidence * 100)}%). Auto-saving...`);
                    // Auto-save effect
                    setTimeout(() => {
                        resetDetection("Data saved automatically!");
                    }, 2000);
                } else {
                    setStatusLabel("WAITING FOR FEEDBACK");
                    setToast("Low confidence. Please verify.");
                }
            } else {
                setStatusLabel("MONITORING");
            }

        } catch (error) {
            console.error("Detection error:", error);
            setStatusLabel("ERROR");
            setVisualFeed("Detection failed");
            if (includeAudio) setAudioFeed("Detection failed");
            setIsFrozen(false);
        } finally {
            isDetectingRef.current = false;
        }
    }, [resetDetection]);

    // --- Camera & Audio Initialization ---
    useEffect(() => {
        let stream;
        const initCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setCameraReady(true);
            } catch (error) {
                setCameraError("Camera access is blocked. Please allow webcam access to continue.");
            }
        };
        initCamera();
        return () => {
            if (stream) stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!cameraReady) return;
        setIsMonitoring(true);
        setStatusLabel("MONITORING");
    }, [cameraReady]);

    // --- Detection Loop ---
    useEffect(() => {
        if (!cameraReady || !streamRef.current || !isMonitoring) return;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(streamRef.current);

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        const gain = audioContext.createGain();
        gain.gain.value = 0;
        processor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            audioChunksRef.current.push(new Float32Array(input));
            if (audioChunksRef.current.length > 60) audioChunksRef.current.shift();
        };
        source.connect(processor);
        processor.connect(gain);
        gain.connect(audioContext.destination);

        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(() => { });
        }

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
            if (isFrozen) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume().catch(() => { });
            }

            const rms = computeRms();
            setRmsLevel(rms);

            if (!baselineReadyRef.current) {
                baselineSumRef.current += rms;
                baselineCountRef.current += 1;
                if (baselineCountRef.current >= BASELINE_SAMPLE_COUNT) {
                    const avg = baselineSumRef.current / baselineCountRef.current;
                    baselineReadyRef.current = true;
                    baselineRmsRef.current = avg;
                    setBaselineRms(avg);
                }
            }

            const now = performance.now();
            const dynamicThreshold = Math.max(threshold, baselineRmsRef.current * BASELINE_MULTIPLIER);
            const shouldAudioTrigger = rms >= dynamicThreshold && now - lastAudioTriggerRef.current > AUDIO_DEBOUNCE_MS;
            const shouldVisualTrigger = now - lastVisualTriggerRef.current > VISUAL_POLL_MS;

            if (!isDetectingRef.current) {
                if (shouldAudioTrigger) {
                    lastAudioTriggerRef.current = now;
                    lastVisualTriggerRef.current = now;
                    runDetection({ includeAudio: true });
                } else if (shouldVisualTrigger) {
                    lastVisualTriggerRef.current = now;
                    runDetection({ includeAudio: false });
                }
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            analyserRef.current = null;
            if (processor) {
                processor.disconnect();
                processor.onaudioprocess = null;
            }
            if (source) source.disconnect();
            if (gain) gain.disconnect();
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            baselineSumRef.current = 0;
            baselineCountRef.current = 0;
            baselineReadyRef.current = false;
            baselineRmsRef.current = 0;
            setBaselineRms(0);
            audioChunksRef.current = [];
        };
    }, [cameraReady, isMonitoring, threshold, isFrozen, runDetection]);

    return {
        videoRef,
        cameraReady,
        cameraError,
        annotatedImage,
        latestVisual,
        latestAudio,
        audioSummary,
        visualFeed,
        audioFeed,
        isFrozen,
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
    };
}
