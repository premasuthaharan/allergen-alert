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
    You are an expert menu parsing service and food allergen analyst. Your task is to extract all food items from this image and format them into a structured JSON array with enhanced ingredient analysis.
    
    For each item on the menu, create a JSON object with the following keys:
    - "dish_name": The name of the dish.
    - "main_ingredients": A list of the primary ingredients mentioned in the description. If no ingredients are listed, use an empty array.
    - "normalized_ingredients": A list of the basic food components that would be found in this dish, breaking down sauces, preparations, and composite ingredients into their core components. For example:
      * "marinara sauce" → ["tomatoes", "garlic", "onions", "herbs"]
      * "alfredo sauce" → ["butter", "cream", "parmesan cheese", "garlic"]
      * "pesto" → ["basil", "pine nuts", "parmesan cheese", "olive oil", "garlic"]
      * "bread crumbs" → ["wheat", "bread"]
      * "teriyaki sauce" → ["soy sauce", "sugar", "rice wine", "ginger"]
      * "caesar dressing" → ["anchovies", "parmesan cheese", "egg", "garlic", "lemon"]
      * "hollandaise" → ["butter", "egg yolks", "lemon"]
    - "other": Any other text associated with the item, such as the description or price.
    
    Use your knowledge of cooking and food preparation to identify hidden allergens in common sauces, seasonings, and preparations.
    
    Your entire response MUST be a single, valid JSON array of these objects. Do not include any text, formatting, or markdown outside of the JSON array.
    
    Example Output:
    [
      {
        "dish_name": "Margherita Pizza",
        "main_ingredients": ["San Marzano tomatoes", "mozzarella cheese", "fresh basil"],
        "normalized_ingredients": ["tomatoes", "mozzarella cheese", "basil", "wheat flour", "olive oil"],
        "other": "A classic pizza with fresh, simple ingredients. $14.99"
      },
      {
        "dish_name": "Chicken Parmesan with Marinara",
        "main_ingredients": ["breaded chicken", "marinara sauce", "parmesan cheese"],
        "normalized_ingredients": ["chicken", "wheat flour", "eggs", "bread crumbs", "tomatoes", "garlic", "onions", "parmesan cheese", "mozzarella cheese"],
        "other": "Crispy breaded chicken with homemade marinara. $22.99"
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
        console.log('🔍 Raw Gemini response text:', text);
        
        try {
            // Try to clean up the response text in case it has extra formatting
            let cleanedText = text.trim();
            
            // Remove markdown code blocks if present
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            // Remove any leading/trailing text that's not part of the JSON array
            const arrayStart = cleanedText.indexOf('[');
            const arrayEnd = cleanedText.lastIndexOf(']');
            
            if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
                cleanedText = cleanedText.substring(arrayStart, arrayEnd + 1);
            }
            
            console.log('🧹 Cleaned text for parsing:', cleanedText);
            
            const parsedData = JSON.parse(cleanedText);
            
            // Validate that we got an array
            if (!Array.isArray(parsedData)) {
                throw new Error('Expected an array of menu items');
            }
            
            console.log('✅ Successfully parsed menu items:', parsedData.length);
            return parsedData;
            
        } catch (parseError) {
            console.error('❌ JSON parsing failed:', parseError.message);
            console.error('📄 Failed to parse text:', text);
            
            // Return a fallback structure
            throw new Error(`Failed to parse menu items from image. Raw response: ${text.substring(0, 200)}...`);
        }
    } else {
        throw new Error("Extraction Failed: Could not extract structured data from the image. Please try again.");
    }
}
