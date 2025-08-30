import pandas as pd
import json
import re

with open("map.json") as f:
    MAP = json.load(f)

RECIPES = pd.read_csv("sample_data.csv")

def find_allergens(ingredients):
    """Returns a set of all allergens found in ingredients list"""
    found = set()
    text = " ".join(ingredients).lower()
    for allergen, keywords in MAP.items():
        for k in keywords:
            if re.search(rf"\b{k}\b", text):
                found.add(allergen)
                break
    return found

def allergen_stats(dish: str):
    """Returns a dictionary with allergen frequency (as a percentage)"""
    subset = RECIPES[RECIPES["dish"].str.contains(dish, case=False, na=False)]
    if subset.empty:
        return None

    counts = {a: 0 for a in MAP.keys()}
    total = len(subset)

    for _, row in subset.iterrows():
        allergens = find_allergens(row['ingredients'.split(",")])
        for a in allergens:
            counts[a] += 1

    # counts to percentages
    percentages = {a: round((c/total)*100, 1) for a, c in counts.items()}
    return {"dish": dish, "total": total, "allergens": percentages}
