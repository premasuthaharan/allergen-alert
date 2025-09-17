import 'dotenv/config';

export default {
  expo: {
    name: 'allergen-alert',
    slug: 'allergen-alert',
    version: '1.0.0',
    extra: {
      apiNinjasKey: process.env.API_NINJAS_KEY,
      apiGeminiKey: process.env.API_GEMINI_KEY,
    },
  },
};
