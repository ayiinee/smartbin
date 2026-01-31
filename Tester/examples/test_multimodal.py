"""
Example script to test SmartBin AI Multimodal Detection
"""
import requests
import json
from pathlib import Path

# Configuration
API_URL = "http://localhost:8000/predict-multimodal"

def test_multimodal(image_path: str = None, audio_path: str = None):
    """
    Test multimodal detection endpoint.
    
    Args:
        image_path: Path to image file (optional)
        audio_path: Path to audio file (optional)
    """
    files = {}
    
    if image_path and Path(image_path).exists():
        files["image"] = (
            Path(image_path).name,
            open(image_path, "rb"),
            "image/jpeg"
        )
        print(f"✅ Added image: {image_path}")
    else:
        print("⚠️  No image provided or file not found")
    
    if audio_path and Path(audio_path).exists():
        files["audio"] = (
            Path(audio_path).name,
            open(audio_path, "rb"),
            "audio/webm"
        )
        print(f"✅ Added audio: {audio_path}")
    else:
        print("⚠️  No audio provided or file not found")
    
    if not files:
        print("❌ Error: At least one of image or audio must be provided")
        return
    
    try:
        print(f"\n🚀 Sending request to {API_URL}...")
        response = requests.post(API_URL, files=files)
        
        if response.status_code == 200:
            result = response.json()
            print("\n" + "="*60)
            print("📊 MULTIMODAL DETECTION RESULT")
            print("="*60)
            print(f"\n🗑️  Trash Type: {result['trash_type']}")
            print(f"📈 Confidence: {result['confidence']:.2%}")
            print(f"⏱️  Processing Time: {result['elapsed_ms']} ms")
            
            print("\n📊 Probabilities:")
            for trash_type, prob in sorted(
                result['probabilities'].items(),
                key=lambda x: x[1],
                reverse=True
            ):
                if prob > 0.01:  # Only show significant probabilities
                    print(f"  • {trash_type}: {prob:.2%}")
            
            print("\n👁️  Visual Result:")
            if result['visual_result'].get('top_class'):
                print(f"  • Class: {result['visual_result']['top_class']}")
                print(f"  • Confidence: {result['visual_result']['top_confidence']:.2%}")
            else:
                print("  • No visual input provided")
            
            print("\n🔊 Audio Result:")
            if result['audio_result'].get('label'):
                print(f"  • Label: {result['audio_result']['label']}")
                print(f"  • Confidence: {result['audio_result']['confidence_score']:.2%}")
            else:
                print("  • No audio input provided")
            
            print("\n⚖️  Fusion Weights:")
            base_weights = result.get("weights", {})
            effective_weights = result.get("effective_weights")
            if effective_weights:
                print(
                    f"  - Base: Visual {base_weights.get('visual', 0):.0%}, "
                    f"Audio {base_weights.get('audio', 0):.0%}"
                )
                print(
                    f"  - Effective: Visual {effective_weights.get('visual', 0):.0%}, "
                    f"Audio {effective_weights.get('audio', 0):.0%}"
                )
            else:
                print(f"  - Visual: {base_weights.get('visual', 0):.0%}")
                print(f"  - Audio: {base_weights.get('audio', 0):.0%}")
            
            print("\n" + "="*60)
            
            # Save result to file
            output_file = "multimodal_result.json"
            with open(output_file, "w") as f:
                json.dump(result, f, indent=2)
            print(f"\n💾 Full result saved to: {output_file}")
            
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    
    except requests.exceptions.ConnectionError:
        print(f"❌ Error: Could not connect to {API_URL}")
        print("   Make sure the backend server is running:")
        print("   uvicorn backend.main:app --host 0.0.0.0 --port 8000")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        # Close file handles
        for file_tuple in files.values():
            if hasattr(file_tuple[1], 'close'):
                file_tuple[1].close()


if __name__ == "__main__":
    import sys
    
    # Example usage
    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    audio_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    print("🧪 SmartBin AI - Multimodal Detection Test")
    print("="*60)
    
    test_multimodal(image_path, audio_path)
    
    print("\n💡 Usage:")
    print("  python examples/test_multimodal.py <image_path> [audio_path]")
    print("\n  Examples:")
    print("  python examples/test_multimodal.py trash.jpg")
    print("  python examples/test_multimodal.py trash.jpg audio.webm")
    print("  python examples/test_multimodal.py None audio.webm")
