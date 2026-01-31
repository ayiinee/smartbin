import os
import cv2
import supervision as sv
from inference import get_model
from inference import InferencePipeline
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_KEY = os.getenv("ROBOFLOW_API_KEY")
MODEL_ID = os.getenv("ROBOFLOW_MODEL_ID", "garbage-2mxmf")

def processing_function(predictions, video_frame):
    """
    Callback function to process each frame.
    This is where you would handle the detection results.
    """
    # Annotate the frame using supervision
    detections = sv.Detections.from_inference(predictions)
    
    # Initialize annotators
    box_annotator = sv.BoxAnnotator()
    label_annotator = sv.LabelAnnotator()

    # Annotate frame
    annotated_frame = box_annotator.annotate(scene=video_frame.image.copy(), detections=detections)
    annotated_frame = label_annotator.annotate(scene=annotated_frame, detections=detections)
    
    # Display the frame (optional, mostly for local debugging)
    cv2.imshow("SmartBin Local Inference", annotated_frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        return None
        
    print(f"Detected: {len(detections)} objects")
    return detections

def run_local_pipeline():
    print(f"Initializing InferencePipeline for model: {MODEL_ID}")
    
    # Initialize the pipeline
    # NOTE: video_reference=0 uses the default webcam.
    # Replace with a video file path (e.g. "video.mp4") to run on a file.
    pipeline = InferencePipeline.init(
        model_id=MODEL_ID,
        video_reference=0,
        on_prediction=processing_function,
        api_key=API_KEY,
    )
    
    print("Starting pipeline... Press 'q' to exit (focus on the window).")
    pipeline.start()
    pipeline.join()

def analyze_static_image(image_path):
    print(f"Analyzing static image: {image_path}")
    model = get_model(model_id=MODEL_ID, api_key=API_KEY)
    
    image = cv2.imread(image_path)
    results = model.infer(image)
    
    detections = sv.Detections.from_inference(results[0])
    print(f"Found {len(detections)} objects")
    return results

if __name__ == "__main__":
    if not API_KEY:
        print("Error: ROBOFLOW_API_KEY not found in .env file.")
    else:
        # Example usage:
        # 1. Run pipeline on webcam:
        try:
            run_local_pipeline()
        except Exception as e:
            print(f"Pipeline error: {e}")
            print("Note: 'inference' package with native support might be needed.")
            print("Install via: pip install inference")
