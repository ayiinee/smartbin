"""
Roboflow local pipeline example using the `inference` package.

Requirements:
  pip install inference opencv-python

Environment variables:
  ROBOFLOW_API_KEY           (required)
  ROBOFLOW_WORKSPACE         (required)
  ROBOFLOW_WORKFLOW_ID       (required)
  ROBOFLOW_VIDEO_SOURCE      (default: "0" for webcam index)
  ROBOFLOW_MAX_FPS           (default: 30)

Press Ctrl+C in the terminal to stop.
"""
import os
import sys

import cv2
from inference import InferencePipeline


def _parse_video_source(value: str):
    try:
        return int(value)
    except ValueError:
        return value


def _parse_int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def my_sink(result, video_frame) -> None:
    output_image = result.get("output_image")
    if output_image is not None:
        cv2.imshow("Roboflow Workflow Output", output_image.numpy_image)
        cv2.waitKey(1)
    print(result)


def main() -> None:
    api_key = os.getenv("ROBOFLOW_API_KEY")
    workspace = os.getenv("ROBOFLOW_WORKSPACE")
    workflow_id = os.getenv("ROBOFLOW_WORKFLOW_ID")
    if not api_key or not workspace or not workflow_id:
        raise RuntimeError(
            "ROBOFLOW_API_KEY, ROBOFLOW_WORKSPACE, and ROBOFLOW_WORKFLOW_ID are required"
        )

    video_source = _parse_video_source(os.getenv("ROBOFLOW_VIDEO_SOURCE", "0"))
    max_fps = _parse_int_env("ROBOFLOW_MAX_FPS", 30)

    pipeline = InferencePipeline.init_with_workflow(
        api_key=api_key,
        workspace_name=workspace,
        workflow_id=workflow_id,
        video_reference=video_source,
        max_fps=max_fps,
        on_prediction=my_sink,
    )
    pipeline.start()
    pipeline.join()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("Error: {}".format(exc), file=sys.stderr)
        sys.exit(1)
