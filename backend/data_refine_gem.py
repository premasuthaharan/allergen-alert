import os
import json
import time
from pymongo import MongoClient, UpdateOne
import google.generativeai as genai
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

# --- CONFIGURATION ---
# Load from environment variables for security
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "recipes"
COLLECTION_NAME = "recipes"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# --- UPDATED: Processing configuration for maximum efficiency ---
BATCH_SIZE = 50 # How many recipes to fetch from the DB at a time
MAX_WORKERS = 20 # Increased for faster parallel processing. You can experiment with higher values.

# --- 1. SETUP API AND DATABASE CONNECTIONS ---
def setup_connections():
    """Initializes and returns the MongoDB collection object."""
    print("Setting up connections...")
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable not set.")
    genai.configure(api_key=GOOGLE_API_KEY)

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    print("Connections successful.")
    return collection

# --- 2. CONSOLIDATED LLM FUNCTION (with Retry Logic) ---
def get_full_ingredient_analysis_from_gemini(ingredients):
    """
    Takes a list of ingredients and returns a full analysis (normalization and usage)
    in a single API call, with an automatic retry mechanism.

    Args:
        ingredients (list): A list of ingredient strings.

    Returns:
        dict: A dictionary containing the analysis, or None on failure.
    """
    prompt = f"""
    You are an expert food data processor. Your task is to return a single, valid JSON object and nothing else.
    Perform two actions on the following ingredient list: normalization and usage analysis.

    **Ingredient List:**
    {json.dumps(ingredients, indent=2)}

    **Task 1: Normalization**
    Create a flat list of normalized, categorized terms. Rules:
    1. Identify the core food item (e.g., "shredded mozzarella" -> "mozzarella").
    2. Add parent categories (e.g., "mozzarella" -> "cheese", "dairy").
    3. Deconstruct sauces into key components (e.g., "sambal oelek" -> "chili").
    4. Exclude "salt", "pepper", "water".
    5. The final list must be unique, lowercase strings.

    **Task 2: Usage Analysis**
    For each original ingredient, determine its "usage" ("central", "garnish", "trace", or "none") and provide a "reason".

    **Output Format:**
    Your response MUST be a single JSON object with two keys: "normalized_ingredients" and "ingredient_analysis".

    **Example Output Structure:**
    {{
      "normalized_ingredients": ["mozzarella", "cheese", "dairy", "pecan", "nuts"],
      "ingredient_analysis": {{
        "1/2 cup shredded mozzarella": {{
            "usage": "central",
            "reason": "Provides the main cheesy component, essential for the dish's texture and flavor."
        }},
        "2 oz finely chopped pecans": {{
            "usage": "garnish",
            "reason": "Adds texture and flavor but can be omitted."
        }}
      }}
    }}
    """
    generation_config = {"response_mime_type": "application/json"}
    # --- UPDATED: Switched to the faster, more cost-effective Flash model ---
    model = genai.GenerativeModel("gemini-1.5-flash-latest", generation_config=generation_config)
    
    # --- NEW: Retry logic with exponential backoff ---
    max_retries = 3
    delay = 2  # Initial delay in seconds
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt, request_options={'timeout': 120})
            return json.loads(response.text)
        except Exception as e:
            print(f"Attempt {attempt + 1}/{max_retries} failed: {e}. Retrying in {delay} seconds...")
            time.sleep(delay)
            delay *= 2  # Double the delay for the next retry
    
    print("All retry attempts failed.")
    return None


# --- 3. TRIAL FUNCTION ---
def trial():
    """
    Runs a sample trial of the analysis process on a few UNPROCESSED recipes
    without writing anything to the database. Prints the output.
    """
    collection = setup_connections()
    sample_size = 3

    print(f"--- Starting Trial Run: Fetching {sample_size} sample UNPROCESSED recipes ---")
    
    query = {"ingredient_analysis_complete": {"$ne": True}}
    samples = list(collection.find(query).limit(sample_size))

    if not samples:
        print("Could not find any unprocessed recipes to run a trial.")
        return

    for recipe in samples:
        recipe_id = recipe["_id"]
        title = recipe.get("title", "N/A")
        ingredients = recipe.get("ingredients", [])
        
        print(f"\n--- Analyzing: {title} ---")
        if not ingredients or not isinstance(ingredients, list):
            print("--> Skipping: No valid ingredients list found.")
            continue

        full_analysis = get_full_ingredient_analysis_from_gemini(ingredients)

        if full_analysis:
            print("\n** Normalized Ingredients **")
            print(json.dumps(full_analysis.get("normalized_ingredients", "N/A"), indent=2))
            print("\n** Ingredient Usage Analysis **")
            print(json.dumps(full_analysis.get("ingredient_analysis", "N/A"), indent=2))
        else:
            print("\n--> Full analysis failed for this recipe.")
    print("\n--- Trial Run Complete ---")

# --- 4. FUNCTION TO PROCESS A SINGLE RECIPE ---
def process_recipe(recipe):
    """Handles the full analysis for one recipe and returns the result."""
    recipe_id = recipe["_id"]
    title_for_log = recipe.get('title', recipe_id)
    ingredients = recipe.get("ingredients")

    if not ingredients or not isinstance(ingredients, list):
        print(f"Skipping recipe {title_for_log}: No ingredients list found.")
        return {"_id": recipe_id, "error": "No ingredients found"}

    # The "Analyzing..." printout is now part of the retry loop
    full_analysis = get_full_ingredient_analysis_from_gemini(ingredients)
    
    if full_analysis and "normalized_ingredients" in full_analysis and "ingredient_analysis" in full_analysis:
        print(f"Successfully analyzed recipe: {title_for_log}")
        return {"_id": recipe_id, "data": full_analysis}
    else:
        print(f"Failed to fully analyze recipe {title_for_log} after all retries.")
        return {"_id": recipe_id, "error": "API analysis failed"}

# --- 5. MAIN PROCESSING LOOP ---
def main():
    """Main function to run the batch processing script."""
    collection = setup_connections()
    
    while True:
        print(f"\nFetching a new batch of {BATCH_SIZE} unprocessed recipes...")
        
        query = {"ingredient_analysis_complete": {"$ne": True}}
        batch = list(collection.find(query).limit(BATCH_SIZE))

        if not batch:
            print("No more recipes to process. All done!")
            break

        print(f"Found {len(batch)} recipes. Starting parallel processing with {MAX_WORKERS} workers...")
        
        update_operations = []
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            results = executor.map(process_recipe, batch)

            for result in results:
                if "data" in result:
                    update_operations.append(UpdateOne(
                        {"_id": result["_id"]},
                        {"$set": {
                            "ingredient_analysis": result["data"]["ingredient_analysis"],
                            "normalized_ingredients": result["data"]["normalized_ingredients"],
                            "ingredient_analysis_complete": True
                        }}
                    ))
                elif "error" in result and result["error"] == "No ingredients found":
                    update_operations.append(UpdateOne(
                        {"_id": result["_id"]},
                        {"$set": {"ingredient_analysis_complete": True, "analysis_error": "No ingredients found"}}
                    ))
        
        if update_operations:
            print(f"Updating {len(update_operations)} recipes in the database...")
            collection.bulk_write(update_operations)
            print("Batch update complete.")
        
if __name__ == "__main__":
    main()
