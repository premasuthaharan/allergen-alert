import json
from db import recipes_collection

def load_json(file_path):
    with open(file_path, "r") as f:
        data = json.load(f)
    
    docs = []
    for recipe_id, recipe_data in data.items():
        recipe_data["_id"] = recipe_id  # preserve original ID
        # remove "ADVERTISEMENT"
        recipe_data["ingredients"] = [
            i.replace("ADVERTISEMENT", "").strip()
            for i in recipe_data.get("ingredients", [])
            if i.strip() != "ADVERTISEMENT"
        ]
        docs.append(recipe_data)
    
    if docs:
        recipes_collection.insert_many(docs)
        print(f"Inserted {len(docs)} recipes from {file_path}")

if __name__ == "__main__":
    load_json("/Users/prema/Downloads/recipes_raw/recipes_raw_nosource_ar.json")
    load_json("/Users/prema/Downloads/recipes_raw/recipes_raw_nosource_epi.json")
    load_json("/Users/prema/Downloads/recipes_raw/recipes_raw_nosource_fn.json")
