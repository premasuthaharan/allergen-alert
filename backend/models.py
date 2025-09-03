from pydantic import BaseModel
from typing import List, Optional

class Recipe(BaseModel):
    title: str
    ingredients: List[str]
    instructions: Optional[str] = ""
    picture_link: Optional[str] = None
    detected_allergens: List[str] = []
