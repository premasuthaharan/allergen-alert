import os
import json
import google.generativeai as genai

def analyze_dish_with_gemini(dish_name, ingredients, allergens, current_conclusion):
    """
    Calls the Gemini API to analyze a dish for allergens using a structured prompt.

    Args:
        dish_name (str): The name of the dish.
        ingredients (list): A list of main ingredients.
        allergens (list): A list of possible allergens to check for.
        current_conclusion (dict): The initial analysis from your custom API.

    Returns:
        dict: The parsed JSON response from the Gemini API, or None if an error occurs.
    """
    try:
        # --- 1. CONFIGURE THE API KEY ---
        # It's best practice to use an environment variable for your API key.
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set.")
        genai.configure(api_key=api_key)

        # --- 2. DEFINE THE MODEL AND PROMPT ---
        # This prompt is taken directly from your 'idea_evaluation.md' file.
        # It is highly structured to ensure a reliable JSON output.
        prompt_template = f"""
        You are an expert in food science and allergen detection.
        Given the following information:
        Dish: "{dish_name}"
        Main Ingredients: {json.dumps(ingredients)}
        Possible Allergens: {json.dumps(allergens)}
        Current Conclusion: {json.dumps(current_conclusion)}

        Tasks:
        1. Normalize each main ingredient to its broadest food category (e.g., “shredded mozzarella” → “cheese”).
        2. For each allergen, classify its usage and explain your reasoning. Use these definitions for usage:
           - "central": The dish cannot be made without this ingredient. It is fundamental to the recipe.
           - "garnish": The ingredient is typically added for flavor or texture but could be omitted upon request.
           - "trace": The ingredient is not intentionally part of the recipe but may be present due to cross-contamination or as a minor component of another ingredient.
           - "none": The ingredient is not usually present in the dish.

        Output your answer as JSON in the following format:
        {{
          "normalized_ingredients": {{
            "shredded mozzarella": "cheese",
            "parmesan": "cheese",
            "italian sausage": "pork",
            "chicken": "chicken"
           }},
          "allergens": {{
            "milk": {{"usage": "central", "reason": "..."}},
            "egg": {{"usage": "garnish", "reason": "..."}},
            "pork": {{"usage": "trace", "reason": "..."}}
           }}
        }}
        """

        # --- 3. SET UP GENERATION CONFIGURATION ---
        # We are enabling JSON mode for reliable, machine-readable output.
        # The low temperature makes the output more deterministic and less "creative".
        generation_config = {
            "temperature": 0.1,
            "response_mime_type": "application/json",
        }

        # --- 4. INITIALIZE THE MODEL AND MAKE THE API CALL ---
        # Using gemini-1.5-flash for its speed and cost-effectiveness.
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config
        )
        response = model.generate_content(prompt_template)

        # --- 5. PARSE AND RETURN THE RESPONSE ---
        # The response text will be a JSON string, which we parse into a Python dict.
        print("Gemini API response:", response.text)  # Debugging line
        return json.loads(response.text)

    except Exception as e:
        print(f"An error occurred: {e}")
        return None

# --- EXAMPLE USAGE ---
# This is how you would call the function from your backend API endpoint.
# if __name__ == "__main__":
#     # 1. Define the input data from your app
#     dish = "Chicken Parmesan"
#     main_ingredients = ["chicken", "shredded mozzarella", "parmesan", "italian sausage"]
#     possible_allergens = ["milk", "egg", "pork"]
#     initial_analysis = {
#         "probability_with_any_allergen": 45,
#         "probability_breakdown": {"milk": 40, "egg": 20, "pork": 10}
#     }

#     # 2. Call the function with your data
#     print("Sending request to Gemini API...")
#     detailed_analysis = analyze_dish_with_gemini(
#         dish_name=dish,
#         ingredients=main_ingredients,
#         allergens=possible_allergens,
#         current_conclusion=initial_analysis
#     )

#     # 3. Print the result
#     if detailed_analysis:
#         print("\n--- Gemini API Response ---")
#         # Using json.dumps for pretty printing the output dictionary
#         print(json.dumps(detailed_analysis, indent=2))
#         print("\n--------------------------\n")

#         # You can now access specific parts of the analysis
#         milk_analysis = detailed_analysis.get("allergens", {}).get("milk", {})
#         print(f"Analysis for Milk Allergen:")
#         print(f"  Usage: {milk_analysis.get('usage')}")
#         print(f"  Reason: {milk_analysis.get('reason')}")
