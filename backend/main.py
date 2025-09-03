from fastapi import FastAPI
from routes import recipes

app = FastAPI(title="Allergen Alert API")

app.include_router(recipes.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Welcome to Allergen Alert API"}
