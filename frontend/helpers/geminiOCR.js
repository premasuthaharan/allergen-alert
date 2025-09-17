// helpers/geminiOCR.js
import Constants from 'expo-constants';
const GEMINI_API_KEY = Constants.expoConfig?.extra?.apiGeminiKey;

export async function extractMenuItemsFromImage(base64ImageData) {
    if (!base64ImageData) throw new Error("No image data to process.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GOOGLE_GEMINI_API_KEY_HERE") {
        throw new Error("Please set your Gemini API key in app config.");
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const prompt = `
    You are an expert menu parsing service. Your task is to extract all food items from this image and format them into a structured JSON array.
    For each item on the menu, create a JSON object with the following keys:
    - "dish_name": The name of the dish.
    - "main_ingredients": A list of the primary ingredients mentioned in the description. If no ingredients are listed, use an empty array.
    - "other": Any other text associated with the item, such as the description or price.
    Your entire response MUST be a single, valid JSON array of these objects. Do not include any text, formatting, or markdown outside of the JSON array.
    Example Output:
    [
      {
        "dish_name": "Margherita Pizza",
        "main_ingredients": ["San Marzano tomatoes", "mozzarella cheese", "fresh basil"],
        "other": "A classic pizza with fresh, simple ingredients. $14.99"
      },
      {
        "dish_name": "Spaghetti Carbonara",
        "main_ingredients": ["pancetta", "egg yolk", "pecorino cheese"],
        "other": "A creamy Roman pasta dish. $18.50"
      }
    ]
    `;
    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64ImageData } },
            ],
        }],
        generationConfig: {
            responseMimeType: "application/json",
        }
    };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`API Error: ${response.status}\n${JSON.stringify(errorBody, null, 2)}`);
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
        return JSON.parse(text);
    } else {
        throw new Error("Extraction Failed: Could not extract structured data from the image. Please try again.");
    }
}
