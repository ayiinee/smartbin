
import sys
import os
import importlib.util

def import_module_from_path(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

# Paths to services
current_dir = os.path.dirname(os.path.abspath(__file__))
carbon_path = os.path.join(current_dir, 'app', 'services', 'carbon.py')
genai_path = os.path.join(current_dir, 'app', 'services', 'genai_reports.py')

# Import directly
carbon = import_module_from_path('carbon', carbon_path)
genai_reports = import_module_from_path('genai_reports', genai_path)

def test_carbon_calc():
    print("--- Testing Carbon Calculation ---")
    
    # Test cases
    scenarios = [
        ("plastic", 10.0),
        ("paper", 5.0),
        ("organic", 20.0), # Food waste
        ("metal", 2.0),
        ("unknown", 5.0)
    ]
    
    total_co2 = 0
    total_methane = 0
    stats = {}

    for w_type, weight in scenarios:
        result = carbon.calculate_impact(w_type, weight)
        print(f"Type: {w_type}, Weight: {weight}kg -> CO2 Reduced: {result['co2_reduced_kg']}kg, Methane Reduced: {result['methane_reduced_kg']}kg")
        print(f"  Note: {result['message']}")
        
        total_co2 += result['co2_reduced_kg']
        total_methane += result['methane_reduced_kg']
        stats[w_type] = stats.get(w_type, 0) + weight

    print(f"\nTotal CO2 Reduced: {total_co2} kg")
    print(f"Total Methane Reduced: {total_methane} kg")
    
    return {
        "period": "Test Run Jan 2026",
        "total_weight_kg": sum(w for _, w in scenarios),
        "breakdown": stats,
        "co2_reduced_total": total_co2,
        "methane_reduced_total": total_methane
    }

def test_genai(stats):
    print("\n--- Testing GenAI Reporting ---")
    print("Checking for API Key...")
    if not os.getenv("GEMINI_API_KEY"):
        print("Skipping GenAI test - No GEMINI_API_KEY found in env.")
        # Try to read it from .env file manually if load_dotenv didn't work in the service import context for some reason
        # (Though the service calls load_dotenv)
        return

    print("Generating Report...")
    # Mocking the client if needed or just letting it fail if key is invalid, but user said key exists
    try:
        report = genai_reports.generate_esg_report(stats)
        print("\n[Generated Report content below]\n")
        print(report)
        print("\n[End of Report]")
    except Exception as e:
        print(f"Error calling GenAI: {e}")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    stats_summary = test_carbon_calc()
    test_genai(stats_summary)
