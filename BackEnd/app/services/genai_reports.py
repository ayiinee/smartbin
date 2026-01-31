
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
else:
    # Handle missing key gracefully in production, though verification script might complain
    print("Warning: GEMINI_API_KEY not found in environment variables.")

def generate_esg_report(stats_summary: dict) -> str:
    """
    Generates a persuasive Environmental Impact Statement using Google Gemini.
    
    Args:
        stats_summary (dict): Dictionary containing consolidated waste statistics.
                              Example:
                              {
                                'period': 'January 2026',
                                'total_weight_kg': 150.5,
                                'breakdown': {'Plastic': 50, 'Organic': 100},
                                'co2_reduced_total': 345.2,
                                'methane_reduced_total': 4.0
                              }
                              
    Returns:
        str: Generated narrative report or error message.
    """
    if not GENAI_API_KEY:
        return "Service Error: Gemini API Key is missing. Cannot generate report."

    try:
        model = genai.GenerativeModel('gemini-1.5-flash') # Using flash for speed/cost effectiveness

        # Construct the prompt
        prompt = f"""
        You are an Environmental Consultant writing a highly persuasive and professional ESG (Environmental, Social, and Governance) impact statement for a Smart Waste Management initiative.
        
        Using the following monthly waste data:
        {stats_summary}
        
        Please draft a concise but impactful "Environmental Impact Statement" (approx 150-200 words).
        
        The report should:
        1. Highlight the key achievements (total waste diverted, CO2 reduced).
        2. Specifically mention the avoidance of methane from organic waste if applicable.
        3. Use professional, inspiring language suitable for a corporate sustainability report or stakeholder presentation.
        4. Focus on the positive environmental outcome ("The Planet Saved", "Clean Air Contribution").
        5. Provide a specific "Equivalent To" comparison (e.g., "This reduction is equivalent to taking X cars off the road" or "planting Y trees").
        
        Format the output with clear bold statements where appropriate.
        """

        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        return f"Error generating report: {str(e)}"
