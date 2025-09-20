import { config } from '../config/config';

// Helper function for individual item analysis (fallback)
const analyzeSingleItem = async (item, userAllergens) => {
    const url = `${config.API_BASE_URL}/api/ingredient_analysis?dish=${encodeURIComponent(item.dish_name)}` +
        item.main_ingredients.map(ing => `&main_ingredients=${encodeURIComponent(ing)}`).join('') +
        (item.normalized_ingredients || []).map(ing => `&normalized_ingredients=${encodeURIComponent(ing)}`).join('') +
        userAllergens.map(allergen => `&user_allergens=${encodeURIComponent(allergen)}`).join('');
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

// Simplified batch analysis function without caching
export const analyzeAllMenuItemsBatch = async (
    menuItems, 
    userAllergens, 
    setAnalysisLoading, 
    setAnalysisProgress,
    setAnalyzedMenuItems,
    Alert
) => {
    try {
        console.log(`Starting batch analysis for ${menuItems.length} menu items...`);
        setAnalysisLoading(true);
        setAnalysisProgress(0);
        
        const allResults = [];
        const BATCH_SIZE = 5;
        
        // Process in batches of 5 to avoid overwhelming the server
        for (let i = 0; i < menuItems.length; i += BATCH_SIZE) {
            const batch = menuItems.slice(i, i + BATCH_SIZE);
            const progressPercent = (i / menuItems.length) * 100;
            setAnalysisProgress(progressPercent);
            
            console.log(`🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(menuItems.length/BATCH_SIZE)} (${batch.length} items)`);
            
            try {
                const response = await Promise.race([
                    fetch(`${config.API_BASE_URL}/api/batch_ingredient_analysis`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            dishes: batch.map(item => ({
                                dish_name: item.dish_name,
                                main_ingredients: item.main_ingredients || [],
                                normalized_ingredients: item.normalized_ingredients || []
                            })),
                            user_allergens: userAllergens
                        })
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`Batch request timed out`)), config.REQUEST_TIMEOUT)
                    )
                ]);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const batchResult = await response.json();
                
                if (batchResult.results && Array.isArray(batchResult.results)) {
                    allResults.push(...batchResult.results);
                    console.log(`✅ Batch completed: ${batchResult.results.length} results in ${batchResult.processing_time}s`);
                } else {
                    throw new Error('Invalid batch response format');
                }
                
            } catch (error) {
                console.error(`❌ Batch failed:`, error);
                
                // Fallback to individual requests for this batch
                console.log(`🔄 Falling back to individual requests for batch...`);
                
                for (const item of batch) {
                    try {
                        const result = await analyzeSingleItem(item, userAllergens);
                        allResults.push(result);
                    } catch (singleError) {
                        console.error(`❌ Individual request failed for ${item.dish_name}:`, singleError);
                        allResults.push({
                            dish: item.dish_name,
                            error: singleError.message,
                            probability_with_any: 0,
                            probability_breakdown: {},
                            common_usage: {}
                        });
                    }
                }
            }
            
            // Small delay between batches
            if (i + BATCH_SIZE < menuItems.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        setAnalysisProgress(100);
        console.log(`🎉 Analysis completed! ${allResults.length} total results`);
        
        // Filter out any undefined results and ensure we have valid data
        const validResults = allResults.filter(result => result && typeof result === 'object');
        setAnalyzedMenuItems(validResults);
        
    } catch (err) {
        setAnalyzedMenuItems([]);
        console.error('Error analyzing menu items:', err);
        Alert.alert('Analysis Error', `Could not analyze menu items: ${err.message}`);
    } finally {
        setAnalysisLoading(false);
        setAnalysisProgress(0);
    }
};
