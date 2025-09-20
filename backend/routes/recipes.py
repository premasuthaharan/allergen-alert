from rapidfuzz import fuzz
from fastapi import APIRouter, Query, Body
from db import recipes_collection
from models import Recipe
from typing import List, Dict, Any
from collections import Counter
from ingredient_mappings import normalize_ingredient, get_allergen_matches, ALLERGEN_CATEGORIES

router = APIRouter()

@router.get("/search", response_model=List[Recipe])
def search(dish: str = Query(..., description="Dish name to search for"), user_allergens: List[str] = Query([])):
    results = recipes_collection.find({"title": {"$regex": dish, "$options": "i"}})
    recipes = []
    for r in results:
        ingredients = r.get("ingredients") or []
        ingredients_text = " ".join(ingredients).lower()
        detected_allergens = [a for a in user_allergens if a.lower() in ingredients_text]

        recipes.append({
            "title": r.get("title", ""),
            "ingredients": ingredients,
            "instructions": r.get("instructions", ""),
            "picture_link": r.get("picture_link"),
            "detected_allergens": detected_allergens
        })
    return recipes

@router.get("/detect")
def detect(dish: str = Query(...,  description="Dish name to check"), user_allergens: List[str] = Query([])):
    results = recipes_collection.find({"title": {"$regex": dish, "$options": "i"}})

    total = 0
    with_any_allergen = 0
    allergen_counts = {a.lower(): 0 for a in user_allergens}

    for r in results:
        total += 1
        ingredients = r.get("ingredients") or []
        ingredients_text = " ".join(ingredients).lower()

        detected = [a for a in user_allergens if a.lower() in ingredients_text]
        if detected:
            with_any_allergen += 1
            for d in detected:
                allergen_counts[d.lower()] += 1

    percentage_any = (with_any_allergen / total * 100) if total > 0 else 0.0
    allergen_breakdown = {
        allergen: round((count / total * 100), 2) if total > 0 else 0.0
        for allergen, count in allergen_counts.items()
    }

    return {
        "dish": dish,
        "total_recipes": total,
        "recipes_with_any_allergen": with_any_allergen,
        "percentage_with_any_allergen": round(percentage_any, 2),
        "allergen_breakdown": allergen_breakdown
    }

@router.get("/match")
def match(
    dish: str = Query(..., description="Dish name to check"),
    user_allergens: List[str] = Query([]),
    main_ingredients: List[str] = Query([]),
    threshold: int = Query(70, description="Fuzzy match threshold (0-100)"),
    ingredient_threshold: int = Query(60, description="Fuzzy match threshold for ingredients (0-100)")
):
    all_recipes = list(recipes_collection.find({}, {"title": 1, "ingredients": 1}))
    scored = []
    dish_lower = dish.lower()
    main_ingredients_lower = [i.lower() for i in main_ingredients if i.strip()]
    for r in all_recipes:
        title = r.get("title", "")
        if not isinstance(title, str) or not title.strip():
            continue
        title_score = fuzz.ratio(dish_lower, title.lower())
        if title_score < 50:
            continue
        # Ingredient fuzzy matching
        recipe_ingredients = [i.lower() for i in (r.get("ingredients") or []) if isinstance(i, str)]
        import re
        detected_main = 0
        if main_ingredients_lower and recipe_ingredients:
            for mi in main_ingredients_lower:
                found = False
                for ri in recipe_ingredients:
                    # Check for whole word match
                    if re.search(r'\\b' + re.escape(mi) + r'\\b', ri):
                        found = True
                        break
                    # Substring match
                    if len(mi) >= 4 and (mi in ri.split() or ri in mi.split()):
                        found = True
                        break
                    # Fuzzy match
                    if fuzz.ratio(mi, ri) >= ingredient_threshold:
                        found = True
                        break
                if found:
                    detected_main += 1
            ing_score = (detected_main / len(main_ingredients_lower)) * 100 if main_ingredients_lower else 0
        else:
            ing_score = 0
        # Combine scores(50% title, 50% ingredients)
        combined_score = 0.5 * title_score + 0.5 * ing_score
        if title_score >= threshold or (main_ingredients_lower and ing_score >= ingredient_threshold):
            scored.append((combined_score, title_score, ing_score, r))
    # Sort by combined score
    scored.sort(reverse=True, key=lambda x: x[0])
    total = len(scored)
    with_any_allergen = 0
    allergen_counts = {a.lower(): 0 for a in user_allergens}
    # For probability calculation
    weighted_allergen_sum = {a.lower(): 0.0 for a in user_allergens}
    weighted_total = 0.0
    for combined_score, title_score, ing_score, r in scored:
        ingredients = r.get("ingredients") or []
        ingredients_text = " ".join(ingredients).lower()
        detected = [a for a in user_allergens if a.lower() in ingredients_text]
        if detected:
            with_any_allergen += 1
            for d in detected:
                allergen_counts[d.lower()] += 1
        # Probability: weight by combined_score
        for a in user_allergens:
            if a.lower() in ingredients_text:
                weighted_allergen_sum[a.lower()] += combined_score
        weighted_total += combined_score
    percentage_any = (with_any_allergen / total * 100) if total > 0 else 0.0
    allergen_breakdown = {
        allergen: round((count / total * 100), 2) if total > 0 else 0.0
        for allergen, count in allergen_counts.items()
    }
    # Probability of allergens (weighted)
    if weighted_total > 0:
        probability_with_any_allergen = round((sum(weighted_allergen_sum.values()) / weighted_total) * 100, 2)
        probability_breakdown = {
            allergen: round((weighted_allergen_sum[allergen] / weighted_total) * 100, 2)
            for allergen in allergen_counts.keys()
        }
    else:
        probability_with_any_allergen = 0.0
        probability_breakdown = {allergen: 0.0 for allergen in allergen_counts.keys()}
    response = {
        "dish": dish,
        "main_ingredients": main_ingredients,
        "total_recipes": total,
        "recipes_with_any_allergen": with_any_allergen,
        "percentage_with_any_allergen": round(percentage_any, 2),
        "allergen_breakdown": allergen_breakdown,
        "probability_with_any_allergen": probability_with_any_allergen,
        "probability_breakdown": probability_breakdown,
        "llm_analysis": None,
        "matches": [
            {
                "title": r.get("title", ""),
                "combined_score": combined_score,
                "title_score": title_score,
                "ingredient_score": ing_score,
                "ingredients": r.get("ingredients", []),
            }
            for combined_score, title_score, ing_score, r in scored
        ]
    }
    return response

@router.get("/ingredient_analysis")
def ingredient_analysis(
    dish: str = Query(..., description="Dish name to check"),
    user_allergens: List[str] = Query([]),
    main_ingredients: List[str] = Query([]),
    normalized_ingredients: List[str] = Query([], description="Normalized ingredients from Gemini")
):
    import time
    start_time = time.time()
    
    result = analyze_single_dish(dish, user_allergens, main_ingredients, normalized_ingredients)
    
    print(f"Single dish analysis took {time.time() - start_time:.3f}s for '{dish}'")
    return result
    for d in matched_dishes:
        matched_titles.append(d.get("title", ""))
        analysis = d.get("ingredient_analysis", {})
        normalized_ings = d.get("normalized_ingredients", [])
        ingredients = d.get("ingredients", [])
        found_any = False
        for allergen in user_allergens:
            # Try to find matching normalized ingredient and use that for analysis
            match_idx = None
            match_str = None
            # Search for allergen in normalized_ingredients
            for idx, norm_ing in enumerate(normalized_ings):
                if allergen.lower() == norm_ing.lower():
                    match_idx = idx
                    match_str = norm_ing
                    break
            # If not found, try preceding element
            if match_idx is None:
                for idx, norm_ing in enumerate(normalized_ings):
                    if idx > 0 and allergen.lower() == normalized_ings[idx-1].lower():
                        match_idx = idx-1
                        match_str = normalized_ings[idx-1]
                        break
            # If still not found, try element above that
            if match_idx is None:
                for idx, norm_ing in enumerate(normalized_ings):
                    if idx > 1 and allergen.lower() == normalized_ings[idx-2].lower():
                        match_idx = idx-2
                        match_str = normalized_ings[idx-2]
                        break
            # Now, try to find an ingredient string containing the matching normalized ingredient
            found_usage = None
            if match_str is not None:
                for ing in ingredients:
                    if match_str.lower() in ing.lower():
                        # Use this ingredient for analysis
                        details = analysis.get(ing, {})
                        if "usage" in details:
                            usage_dict[allergen.lower()].append(details["usage"])
                            allergen_counts[allergen.lower()] += 1
                            found_usage = details["usage"]
                            found_any = True
                        break
            # If no match found, put null for common_usage
            if not found_usage:
                usage_dict[allergen.lower()].append(None)
        if found_any:
            with_any_allergen += 1
    percentage_with_any = (with_any_allergen / total * 100) if total else 0.0
    probability_breakdown = {}
    for allergen, count in allergen_counts.items():
        # If allergen is in main_ingredients, set probability to 100%
        if any(allergen.lower() == ing.lower() for ing in main_ingredients):
            probability_breakdown[allergen] = 100.0
        else:
            probability_breakdown[allergen] = round((count / total * 100), 2) if total else 0.0
    # Find most common usage for each allergen, breaking ties by most extreme: central > garnish > trace
    usage_priority = {"central": 0, "garnish": 1, "trace": 2, None: 3}
    def pick_most_extreme_with_count(usages):
        if not usages:
            return {"usage": None, "count": 0}
        count = Counter(usages)
        max_count = max(count.values())
        tied = [u for u, c in count.items() if c == max_count]
        tied_sorted = sorted(tied, key=lambda u: usage_priority.get(u, 99))
        usage = tied_sorted[0]
        return {"usage": usage, "count": count[usage]}
    common_usage = {
        allergen: pick_most_extreme_with_count(usages)
        for allergen, usages in usage_dict.items()
    }
    return {
        "dish": dish,
        "main_ingredients": main_ingredients,
        "total_recipes": total,
        "probability_with_any": round(percentage_with_any, 2),
        "probability_breakdown": probability_breakdown,
        "common_usage": common_usage
    }

@router.post("/batch_ingredient_analysis")
def batch_ingredient_analysis(
    request_data: Dict[str, Any] = Body(...)
):
    """
    Analyze multiple dishes in a single request for better performance.
    Expected format:
    {
        "dishes": [
            {
                "dish_name": "pasta", 
                "main_ingredients": ["cheese", "tomato"],
                "normalized_ingredients": ["tomatoes", "mozzarella cheese", "wheat flour"]
            },
            {
                "dish_name": "pizza", 
                "main_ingredients": ["cheese"],
                "normalized_ingredients": ["mozzarella cheese", "wheat flour", "tomatoes"]
            }
        ],
        "user_allergens": ["dairy", "nuts"]
    }
    """
    import time
    start_time = time.time()
    
    dishes = request_data.get("dishes", [])
    user_allergens = request_data.get("user_allergens", [])
    
    if not dishes:
        return {"error": "No dishes provided"}
    
    print(f"Processing batch request for {len(dishes)} dishes with allergens: {user_allergens}")
    
    results = []
    
    for dish_data in dishes:
        dish_name = dish_data.get("dish_name", "")
        main_ingredients = dish_data.get("main_ingredients", [])
        normalized_ingredients = dish_data.get("normalized_ingredients", [])
        
        if not dish_name:
            results.append({
                "dish": "",
                "error": "Dish name is required",
                "probability_with_any": 0,
                "probability_breakdown": {},
                "common_usage": {}
            })
            continue
        
        try:
            # Reuse the existing logic from ingredient_analysis
            result = analyze_single_dish(dish_name, user_allergens, main_ingredients, normalized_ingredients)
            results.append(result)
        except Exception as e:
            print(f"Error analyzing {dish_name}: {e}")
            results.append({
                "dish": dish_name,
                "error": str(e),
                "probability_with_any": 0,
                "probability_breakdown": {},
                "common_usage": {}
            })
    
    end_time = time.time()
    print(f"Batch analysis completed in {end_time - start_time:.3f}s for {len(dishes)} dishes")
    
    return {
        "results": results,
        "total_dishes": len(dishes),
        "processing_time": round(end_time - start_time, 3)
    }

def analyze_single_dish(dish: str, user_allergens: List[str], main_ingredients: List[str] = [], normalized_ingredients: List[str] = []):
    """Enhanced analysis logic with ingredient normalization and mapping"""
    
    # Step 1: Get all relevant ingredients for analysis
    all_ingredients = []
    
    # Add main ingredients from Gemini
    all_ingredients.extend(main_ingredients)
    
    # Add normalized ingredients from Gemini if available
    if normalized_ingredients:
        all_ingredients.extend(normalized_ingredients)
        print(f"Using Gemini normalized ingredients: {normalized_ingredients}")
    
    # Step 2: Further normalize using our mapping system
    additional_normalized = []
    for ingredient in main_ingredients:
        mapped = normalize_ingredient(ingredient)
        additional_normalized.extend(mapped)
    
    all_ingredients.extend(additional_normalized)
    
    # Remove duplicates while preserving order
    unique_ingredients = []
    seen = set()
    for ingredient in all_ingredients:
        ingredient_lower = ingredient.lower()
        if ingredient_lower not in seen:
            unique_ingredients.append(ingredient_lower)
            seen.add(ingredient_lower)
    
    print(f"All ingredients for analysis: {unique_ingredients}")
    
    # Step 3: Enhanced allergen detection using our mapping system
    allergen_matches, all_normalized = get_allergen_matches(unique_ingredients, user_allergens)
    
    # Step 4: Calculate probabilities based on enhanced detection
    probability_breakdown = {}
    common_usage = {}
    
    for user_allergen in user_allergens:
        allergen_lower = user_allergen.lower()
        matches = allergen_matches.get(user_allergen, [])
        
        # Check if allergen is directly in ingredients or normalized ingredients
        direct_match = False
        
        # Check direct ingredient matches
        for ingredient in unique_ingredients:
            if (allergen_lower in ingredient or 
                ingredient in allergen_lower or
                any(allergen_lower in cat_ingredient or cat_ingredient in allergen_lower 
                    for cat_ingredient in ALLERGEN_CATEGORIES.get(allergen_lower, []))):
                direct_match = True
                break
        
        # Check if we found matches through our mapping system
        mapping_match = len(matches) > 0
        
        # Calculate probability
        if direct_match or mapping_match:
            # If ingredient is explicitly listed, high probability
            if any(allergen_lower == ing.lower() for ing in main_ingredients + normalized_ingredients):
                probability = 100.0
                usage = "central"
            # If found through normalization (like marinara -> tomatoes), high probability  
            elif mapping_match:
                probability = 90.0
                usage = "central"
            # If found through category matching, medium probability
            else:
                probability = 75.0
                usage = "likely"
        else:
            # Fall back to database analysis for dishes we have data on
            probability, usage = get_database_probability(dish, user_allergen)
        
        probability_breakdown[allergen_lower] = probability
        common_usage[allergen_lower] = {
            "usage": usage,
            "count": 1 if probability > 0 else 0,
            "matches": matches if mapping_match else []
        }
    
    # Calculate overall probability
    max_probability = max(probability_breakdown.values()) if probability_breakdown.values() else 0.0
    
    return {
        "dish": dish,
        "main_ingredients": main_ingredients,
        "normalized_ingredients": normalized_ingredients,
        "analyzed_ingredients": unique_ingredients,
        "total_recipes": 1,  # Simplified since we're using enhanced detection
        "probability_with_any": max_probability,
        "probability_breakdown": probability_breakdown,
        "common_usage": common_usage,
        "allergen_matches": allergen_matches
    }

def get_database_probability(dish: str, user_allergen: str):
    """Fallback to database analysis for dishes we have recipe data on"""
    try:
        # Quick database lookup for this specific dish and allergen
        search_patterns = [
            {"title": {"$regex": f"\\b{dish}\\b", "$options": "i"}},
            {"title": {"$regex": dish, "$options": "i"}},
        ]
        
        matched_dishes = []
        for pattern in search_patterns:
            cursor = recipes_collection.find(
                pattern, 
                {"title": 1, "ingredients": 1}
            ).limit(20)
            
            for d in cursor:
                title = d.get("title", "")
                if not isinstance(title, str):
                    continue
                score = fuzz.ratio(dish.lower(), title.lower())
                if score >= 70:
                    matched_dishes.append(d)
            
            if len(matched_dishes) >= 10:
                break
        
        if not matched_dishes:
            return 0.0, None
        
        # Count allergen occurrences
        allergen_count = 0
        total_count = len(matched_dishes)
        
        for d in matched_dishes:
            ingredients = d.get("ingredients", [])
            ingredients_text = " ".join(ingredients).lower()
            if user_allergen.lower() in ingredients_text:
                allergen_count += 1
        
        probability = (allergen_count / total_count * 100) if total_count > 0 else 0.0
        usage = "central" if probability > 50 else "possible" if probability > 0 else None
        
        return probability, usage
        
    except Exception as e:
        print(f"Database lookup failed for {dish}/{user_allergen}: {e}")
        return 0.0, None
