# Comprehensive ingredient mapping for allergen detection
# Maps complex ingredients, sauces, and preparations to their base components

INGREDIENT_MAPPINGS = {
    # Tomato-based items
    'marinara': ['tomatoes', 'garlic', 'onions', 'herbs'],
    'marinara sauce': ['tomatoes', 'garlic', 'onions', 'herbs'],
    'tomato sauce': ['tomatoes', 'onions', 'garlic'],
    'tomato paste': ['tomatoes'],
    'ketchup': ['tomatoes', 'vinegar', 'sugar'],
    'pizza sauce': ['tomatoes', 'garlic', 'herbs'],
    'pasta sauce': ['tomatoes', 'garlic', 'onions'],
    'salsa': ['tomatoes', 'onions', 'peppers', 'cilantro'],
    'arrabbiata': ['tomatoes', 'garlic', 'red peppers', 'olive oil'],
    'puttanesca': ['tomatoes', 'olives', 'capers', 'anchovies', 'garlic'],
    
    # Dairy-based sauces and items
    'alfredo': ['butter', 'cream', 'parmesan cheese', 'garlic'],
    'alfredo sauce': ['butter', 'cream', 'parmesan cheese', 'garlic'],
    'cream sauce': ['cream', 'butter'],
    'white sauce': ['butter', 'flour', 'milk'],
    'bechamel': ['butter', 'flour', 'milk'],
    'hollandaise': ['butter', 'egg yolks', 'lemon'],
    'caesar dressing': ['anchovies', 'parmesan cheese', 'egg', 'garlic', 'lemon'],
    'ranch dressing': ['mayonnaise', 'buttermilk', 'herbs'],
    'blue cheese dressing': ['blue cheese', 'mayonnaise', 'buttermilk'],
    'mozzarella': ['milk'],
    'parmesan': ['milk'],
    'cheddar': ['milk'],
    'ricotta': ['milk'],
    'mascarpone': ['cream'],
    'yogurt': ['milk'],
    'sour cream': ['cream'],
    'butter': ['cream'],
    'ghee': ['butter'],
    
    # Egg-based items
    'mayonnaise': ['eggs', 'oil'],
    'aioli': ['eggs', 'garlic', 'olive oil'],
    'hollandaise': ['egg yolks', 'butter', 'lemon'],
    'carbonara': ['eggs', 'cheese', 'pancetta'],
    'custard': ['eggs', 'milk', 'sugar'],
    'meringue': ['egg whites', 'sugar'],
    
    # Nut-based items
    'pesto': ['basil', 'pine nuts', 'parmesan cheese', 'olive oil', 'garlic'],
    'almond milk': ['almonds', 'water'],
    'peanut butter': ['peanuts'],
    'nutella': ['hazelnuts', 'cocoa', 'milk'],
    'marzipan': ['almonds', 'sugar'],
    'praline': ['nuts', 'sugar'],
    'tahini': ['sesame seeds'],
    'hummus': ['chickpeas', 'tahini', 'garlic', 'lemon'],
    
    # Soy-based items
    'soy sauce': ['soybeans', 'wheat'],
    'teriyaki': ['soy sauce', 'sugar', 'rice wine', 'ginger'],
    'miso': ['soybeans'],
    'tempeh': ['soybeans'],
    'edamame': ['soybeans'],
    'soybean oil': ['soybeans'],
    
    # Wheat/Gluten items
    'bread crumbs': ['wheat', 'bread'],
    'breadcrumbs': ['wheat', 'bread'],
    'panko': ['wheat', 'bread'],
    'flour': ['wheat'],
    'pasta': ['wheat', 'eggs'],
    'noodles': ['wheat'],
    'couscous': ['wheat'],
    'bulgur': ['wheat'],
    'semolina': ['wheat'],
    'seitan': ['wheat gluten'],
    'soy sauce': ['soybeans', 'wheat'],
    'beer': ['wheat', 'barley'],
    'malt': ['barley'],
    
    # Seafood/Fish items
    'worcestershire': ['anchovies', 'vinegar', 'molasses'],
    'fish sauce': ['fish', 'salt'],
    'caesar dressing': ['anchovies', 'parmesan cheese', 'egg'],
    'capers': ['capers'],  # Often processed with fish
    'surimi': ['fish'],
    'imitation crab': ['fish'],
    
    # Shellfish items
    'oyster sauce': ['oysters'],
    'shrimp paste': ['shrimp'],
    'lobster bisque': ['lobster', 'cream'],
    'crab cake': ['crab', 'eggs', 'breadcrumbs'],
    
    # Complex preparations
    'parmigiana': ['parmesan cheese', 'mozzarella', 'eggs', 'breadcrumbs', 'tomato sauce'],
    'carbonara': ['eggs', 'parmesan cheese', 'pancetta', 'pasta'],
    'quiche': ['eggs', 'cream', 'cheese', 'pastry'],
    'risotto': ['rice', 'butter', 'cheese', 'stock'],
    'gnocchi': ['potatoes', 'flour', 'eggs'],
    'tempura': ['flour', 'eggs', 'ice water'],
    'batter': ['flour', 'eggs', 'milk'],
    'breaded': ['breadcrumbs', 'eggs', 'flour'],
    'fried': ['oil'],  # May contain allergens from breading
    
    # Asian sauces and preparations
    'hoisin': ['soybeans', 'garlic', 'chilies'],
    'black bean sauce': ['black beans', 'garlic'],
    'pad thai sauce': ['tamarind', 'fish sauce', 'palm sugar'],
    'curry paste': ['chilies', 'lemongrass', 'garlic', 'shrimp paste'],
    'miso soup': ['miso', 'seaweed', 'tofu'],
    
    # Baking and dessert items
    'chocolate': ['cocoa', 'milk', 'sugar'],
    'white chocolate': ['cocoa butter', 'milk', 'sugar'],
    'milk chocolate': ['cocoa', 'milk', 'sugar'],
    'ice cream': ['milk', 'cream', 'eggs', 'sugar'],
    'sorbet': ['fruit', 'sugar'],
    'gelato': ['milk', 'cream', 'eggs'],
    'custard': ['eggs', 'milk', 'sugar'],
    'pudding': ['milk', 'eggs', 'sugar'],
    'cake': ['flour', 'eggs', 'butter', 'sugar'],
    'cookie': ['flour', 'butter', 'eggs', 'sugar'],
    'pastry': ['flour', 'butter', 'eggs'],
    'croissant': ['flour', 'butter', 'eggs'],
    'danish': ['flour', 'butter', 'eggs'],
}

# Allergen categories for better matching
ALLERGEN_CATEGORIES = {
    'dairy': ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'ghee', 'lactose', 'casein', 'whey'],
    'eggs': ['egg', 'eggs', 'egg whites', 'egg yolks', 'albumin'],
    'nuts': ['almonds', 'walnuts', 'pecans', 'cashews', 'pistachios', 'hazelnuts', 'macadamia', 'brazil nuts', 'pine nuts'],
    'peanuts': ['peanuts', 'groundnuts'],
    'soy': ['soybeans', 'soy', 'tofu', 'tempeh', 'miso', 'edamame'],
    'wheat': ['wheat', 'flour', 'gluten', 'bulgur', 'semolina', 'spelt', 'kamut'],
    'fish': ['fish', 'salmon', 'tuna', 'cod', 'bass', 'anchovy', 'anchovies', 'sardines'],
    'shellfish': ['shrimp', 'crab', 'lobster', 'oysters', 'mussels', 'clams', 'scallops'],
    'sesame': ['sesame', 'tahini'],
    'tomatoes': ['tomatoes', 'tomato']
}

def normalize_ingredient(ingredient):
    """
    Normalize an ingredient to its base components
    """
    ingredient_lower = ingredient.lower().strip()
    
    # Direct mapping
    if ingredient_lower in INGREDIENT_MAPPINGS:
        return INGREDIENT_MAPPINGS[ingredient_lower]
    
    # Partial matching for complex ingredient names
    for mapped_ingredient, base_ingredients in INGREDIENT_MAPPINGS.items():
        if mapped_ingredient in ingredient_lower or ingredient_lower in mapped_ingredient:
            return base_ingredients
    
    # If no mapping found, return the original ingredient
    return [ingredient_lower]

def get_allergen_matches(ingredients, user_allergens):
    """
    Enhanced allergen detection using normalization and category matching
    """
    all_normalized = []
    
    # Normalize all ingredients
    for ingredient in ingredients:
        normalized = normalize_ingredient(ingredient)
        all_normalized.extend(normalized)
    
    # Check for allergen matches
    allergen_matches = {}
    
    for user_allergen in user_allergens:
        user_allergen_lower = user_allergen.lower()
        matches = []
        
        # Direct matches
        for norm_ingredient in all_normalized:
            if user_allergen_lower in norm_ingredient or norm_ingredient in user_allergen_lower:
                matches.append(norm_ingredient)
        
        # Category-based matching
        if user_allergen_lower in ALLERGEN_CATEGORIES:
            category_ingredients = ALLERGEN_CATEGORIES[user_allergen_lower]
            for category_ingredient in category_ingredients:
                for norm_ingredient in all_normalized:
                    if category_ingredient in norm_ingredient or norm_ingredient in category_ingredient:
                        matches.append(norm_ingredient)
        
        allergen_matches[user_allergen] = list(set(matches))  # Remove duplicates
    
    return allergen_matches, all_normalized
