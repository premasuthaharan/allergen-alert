from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from data_load import allergen_stats

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/search")
def search(dish: str):
    result = allergen_stats(dish)
    if not result:
        return {"error": "Dish not found"}
    return result
