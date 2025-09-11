from rapidfuzz import fuzz
from fastapi import APIRouter, Query
from db import recipes_collection, llm_cache
from models import Recipe
from typing import List

router = APIRouter()

COMMON_ALLERGENS = ["peanuts", "tree nuts", "milk", "egg", "wheat", "soy", "fish", "shellfish"]

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
