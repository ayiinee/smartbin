
"""
Service for calculating environmental impact based on waste type and weight.
References IPCC standards for emission factors and Global Warming Potential (GWP).
"""

# Emission Factors (kg CO2e reduced per kg of waste recycled/diverted)
# These values are estimates based on life-cycle assessment (LCA) literature and IPCC guidelines.
# Positive values indicate CO2e avoided by recycling/composting vs. landfilling.

# Plastic (e.g., PET, HDPE): Recycling vs. Landfill
# Approx 1.5 - 2.5 kg saved usually, but production avoided can be higher.
# User asked for ~6.0 for plastic (high estimate including production avoidance)
PLASTIC_FACTOR_CO2E = 6.0 

# Paper: Recycling vs. Landfill
PAPER_FACTOR_CO2E = 1.0

# Metal (Aluminum/Steel): High energy savings from recycling
METAL_FACTOR_CO2E = 4.5

# Organic: Methane avoidance.
# Methane has 28x GWP (IPCC AR5) compared to CO2.
# Landfilling organic waste generates methane.
GWP_METHANE = 28
# Estimate: kg of Methane generated per kg of organic waste in landfill.
# IPCC: DOC (Degradable Organic Carbon) ~0.15, DOCf ~0.5, MCF ~1.0 for unmanaged sites.
# 1 kg waste -> 0.15 kg C -> 0.075 kg C degraded -> converted to CH4/CO2.
# Approx 0.04 kg CH4 per kg waste is a reasonable conservative estimate for calculations.
ORGANIC_METHANE_GENERATION_FACTOR = 0.04

def calculate_impact(waste_type: str, weight_kg: float) -> dict:
    """
    Calculates the environmental impact reduction for a given waste item.
    
    Args:
        waste_type (str): The category of waste (plastic, paper, metal, organic, etc.)
        weight_kg (float): The weight of the waste in kilograms.
        
    Returns:
        dict: {
            "co2_reduced_kg": float,
            "methane_reduced_kg": float,  # Specifically for organic
            "energy_saved_kwh": float     # Optional simplified metric
        }
    """
    waste_type = waste_type.lower().strip()
    impact = {
        "co2_reduced_kg": 0.0,
        "methane_reduced_kg": 0.0,
        "message": ""
    }

    if weight_kg <= 0:
        return impact

    if "plastic" in waste_type or "botol" in waste_type:
        # Direct CO2e reduction from recycling
        impact["co2_reduced_kg"] = weight_kg * PLASTIC_FACTOR_CO2E
        impact["message"] = "Recycling plastic averts significant oil consumption and emissions."

    elif "paper" in waste_type or "kertas" in waste_type or "cardboard" in waste_type:
        impact["co2_reduced_kg"] = weight_kg * PAPER_FACTOR_CO2E
        impact["message"] = "Recycling paper saves trees and water."

    elif "metal" in waste_type or "can" in waste_type or "kaleng" in waste_type:
        impact["co2_reduced_kg"] = weight_kg * METAL_FACTOR_CO2E
        impact["message"] = "Recycling metal saves massive amounts of mining energy."

    elif "organic" in waste_type or "food" in waste_type or "makanan" in waste_type:
        # Focus on Methane avoidance
        methane_avoided = weight_kg * ORGANIC_METHANE_GENERATION_FACTOR
        impact["methane_reduced_kg"] = methane_avoided
        # Convert methane to CO2e for total impact
        impact["co2_reduced_kg"] = methane_avoided * GWP_METHANE
        impact["message"] = "Composting avoids methane production in landfills."
    
    else:
        # General/Residual waste - minimal reduction assumed or calculated as avoided landfill mass
        # For now, 0 impact calculated for unknown types
        impact["message"] = "General waste diversion."

    # Round values for display
    impact["co2_reduced_kg"] = round(impact["co2_reduced_kg"], 4)
    impact["methane_reduced_kg"] = round(impact["methane_reduced_kg"], 4)

    return impact
