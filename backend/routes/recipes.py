from fastapi import APIRouter, Query
from db import recipes_collection
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