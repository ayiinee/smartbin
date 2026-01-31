"""
Roboflow serverless WebRTC streaming example.

Requirements:
  pip install "inference-sdk[webrtc]" opencv-python

Environment variables:
  ROBOFLOW_API_KEY           (required)
  ROBOFLOW_WORKSPACE         (required)
  ROBOFLOW_WORKFLOW_ID       (required)
  ROBOFLOW_IMAGE_INPUT       (default: "image")
  ROBOFLOW_API_URL           (default: "https://serverless.roboflow.com")
  ROBOFLOW_STREAM_OUTPUT     (default: "output_image")
  ROBOFLOW_DATA_OUTPUT       (default: "predictions")
  ROBOFLOW_PLAN              (default: "webrtc-gpu-medium")
  ROBOFLOW_REGION            (default: "us")
  ROBOFLOW_TIMEOUT_SEC       (default: 600)
  ROBOFLOW_WIDTH             (default: 1280)
  ROBOFLOW_HEIGHT            (default: 720)

Press "q" in the video window to stop.
"""
import os
import sys

import cv2
from inference_sdk import InferenceHTTPClient
from inference_sdk.webrtc import StreamConfig, VideoMetadata, WebcamSource


def _build_client() -> InferenceHTTPClient:
    api_url = os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
    api_key = os.getenv("ROBOFLOW_API_KEY")
    if not api_key:
        raise RuntimeError("ROBOFLOW_API_KEY is required")
    if hasattr(InferenceHTTPClient, "init"):
        return InferenceHTTPClient.init(api_url=api_url, api_key=api_key)
    return InferenceHTTPClient(api_url=api_url, api_key=api_key)


def _parse_list_env(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


def _parse_int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def main() -> None:
    workspace = os.getenv("ROBOFLOW_WORKSPACE")
    workflow_id = os.getenv("ROBOFLOW_WORKFLOW_ID")
    image_input = os.getenv("ROBOFLOW_IMAGE_INPUT", "image")
    if not workspace or not workflow_id:
        raise RuntimeError("ROBOFLOW_WORKSPACE and ROBOFLOW_WORKFLOW_ID are required")

    width = _parse_int_env("ROBOFLOW_WIDTH", 1280)
    height = _parse_int_env("ROBOFLOW_HEIGHT", 720)
    source = WebcamSource(resolution=(width, height))

    config = StreamConfig(
        stream_output=_parse_list_env("ROBOFLOW_STREAM_OUTPUT", ["output_image"]),
        data_output=_parse_list_env("ROBOFLOW_DATA_OUTPUT", ["predictions"]),
        requested_plan=os.getenv("ROBOFLOW_PLAN", "webrtc-gpu-medium"),
        requested_region=os.getenv("ROBOFLOW_REGION", "us"),
        processing_timeout=_parse_int_env("ROBOFLOW_TIMEOUT_SEC", 600),
    )

    client = _build_client()
    session = client.webrtc.stream(
        source=source,
        workflow=workflow_id,
        workspace=workspace,
        image_input=image_input,
        config=config,
    )

    @session.on_frame
    def show_frame(frame, metadata) -> None:  # metadata: VideoMetadata
        cv2.imshow("Roboflow Workflow Output", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            session.close()

    @session.on_data()
    def on_data(data: dict, metadata: VideoMetadata) -> None:
        print("Frame {}: {}".format(metadata.frame_id, data))

    print("Streaming started. Press 'q' in the window to stop.")
    session.run()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("Error: {}".format(exc), file=sys.stderr)
        sys.exit(1)
