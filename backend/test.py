from db import recipes_collection

result = recipes_collection.find_one({"title": {"$regex": "chicken", "$options": "i"}})
print(result)
