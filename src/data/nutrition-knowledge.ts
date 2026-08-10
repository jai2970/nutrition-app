export type KnowledgeCategory =
  | "protein"
  | "carbs"
  | "fat"
  | "vitamins"
  | "minerals"
  | "diet-plans"
  | "vegetarian"
  | "weight-loss"
  | "weight-gain"
  | "indian-foods"
  | "myths";

export type KnowledgeChunk = {
  id: string;
  category: KnowledgeCategory;
  content: string;
  source: string;
};

// Curated reference chunks for the RAG diet advisor — factual, concise
// entries grounded in commonly cited Indian nutritional reference values
// (IFCT composition figures, ICMR-NIN dietary guidance), written manually
// rather than scraped from copyrighted source PDFs. These are retrieval
// chunks, not prose articles — keep additions in the same terse style.
export const NUTRITION_KNOWLEDGE: KnowledgeChunk[] = [
  // --- Protein ---
  {
    id: "p-1",
    category: "protein",
    content:
      "1 katori (150g) of cooked dal, any variety, provides roughly 7-9g of protein — a useful daily staple but not enough on its own to meet most adults' daily protein needs, even across two or three servings.",
    source: "IFCT 2017",
  },
  {
    id: "p-2",
    category: "protein",
    content:
      "Paneer is one of the richest vegetarian protein sources in the Indian diet, at roughly 18g protein per 100g. A 100g serving covers a meaningful share of a day's protein target on its own.",
    source: "IFCT 2017",
  },
  {
    id: "p-3",
    category: "protein",
    content:
      "Curd/dahi provides about 3-4g protein per 100g; a large bowl (200g) contributes roughly 6-8g. It's a steady, low-effort contributor across meals rather than a primary protein source by itself.",
    source: "IFCT 2017",
  },
  {
    id: "p-4",
    category: "protein",
    content:
      "Soybean and soy chunks (nutrela/meal maker) are among the highest-protein plant foods used in Indian kitchens, at roughly 40-52g protein per 100g dry weight. Even rehydrated, a 50g dry serving can add 20-25g of protein to a meal.",
    source: "IFCT 2017",
  },
  {
    id: "p-5",
    category: "protein",
    content:
      "Sprouted moong and chana provide roughly 7-9g protein per 100g and also raise vitamin C and folate content compared to the unsprouted legume, which in turn improves iron absorption when eaten in the same meal.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "p-6",
    category: "protein",
    content:
      "Peanuts and almonds provide roughly 25g and 21g protein per 100g respectively, so a small daily handful (~30g) is a meaningful protein and healthy-fat contributor, not just a snack.",
    source: "IFCT 2017",
  },
  {
    id: "p-7",
    category: "protein",
    content:
      "A whole egg provides about 6g of protein, split roughly evenly between white and yolk. Eating 2-3 eggs daily adds 12-18g of complete protein, making eggetarian diets meaningfully easier to hit protein targets on than strict vegetarian ones.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "p-8",
    category: "protein",
    content:
      "Milk, curd, eggs, and meat are 'complete' proteins containing all nine essential amino acids in adequate proportions, while most single plant proteins are 'incomplete' and benefit from being paired with a complementary source, such as dal with rice.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "p-9",
    category: "protein",
    content:
      "ICMR-NIN's RDA for protein is approximately 0.8-1g per kg of body weight per day for a sedentary adult, rising to roughly 1.2-1.6g per kg per day for those who are physically active or doing resistance training regularly.",
    source: "ICMR-NIN RDA 2020",
  },
  {
    id: "p-10",
    category: "protein",
    content:
      "For most recreational strength training, protein intake toward the higher end of the 1.2-1.6g/kg active-adult range is generally sufficient; intakes well above this show diminishing returns for muscle protein synthesis in most people.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },

  // --- Carbs ---
  {
    id: "carb-1",
    category: "carbs",
    content:
      "A typical Indian thali derives roughly 60-70% of its calories from carbohydrates (rice, roti, potato-heavy sabzi), well above the ICMR-NIN recommended range of about 50-55% of total calories from carbohydrates.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "carb-2",
    category: "carbs",
    content:
      "This carb-heavy pattern is largely driven by rice or roti forming the base of nearly every Indian meal, with vegetables, dal, and other protein sources often served as smaller side portions rather than the meal's foundation.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "carb-3",
    category: "carbs",
    content:
      "Shifting the plate ratio — a smaller portion of rice or roti alongside a larger portion of dal, paneer, or vegetables — is a practical way to bring a typical Indian meal's macro balance closer to recommended levels without eliminating staple carbs entirely.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "carb-4",
    category: "carbs",
    content:
      "Refined-flour foods (maida-based naan, white bread, most bakery items) and deep-fried snacks (puri, samosa, pakora) contribute calorie-dense, lower-fiber carbohydrates. Swapping some of these for whole-wheat or millet-based alternatives raises fiber intake at a similar calorie level.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "carb-5",
    category: "carbs",
    content:
      "Millets (jowar, bajra, ragi) have a lower glycemic response than polished white rice and are higher in fiber and minerals. ICMR-NIN has actively promoted them as a partial substitute for rice and wheat in the Indian diet.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },

  // --- Fat ---
  {
    id: "fat-1",
    category: "fat",
    content:
      "ICMR-NIN recommends total fat intake stay within roughly 20-30% of daily calories for adults, with more emphasis on fat quality (unsaturated over saturated/trans) than on eliminating fat from the diet altogether.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "fat-2",
    category: "fat",
    content:
      "Ghee in moderate amounts (roughly 1-2 teaspoons per meal) is not inherently unhealthy — it's primarily saturated fat with a high smoke point suited to Indian cooking, and traditional diets have included it for generations without it being a primary driver of health issues when total calorie intake is controlled.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "fat-3",
    category: "fat",
    content:
      "Repeatedly reheated cooking oil — common with deep-frying oil reused across days — degrades and forms harmful compounds. This is a more meaningful everyday health concern than the type of fresh oil or ghee used in a single meal.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "fat-4",
    category: "fat",
    content:
      "Coconut and groundnut oil, common in South Indian and Western Indian cooking respectively, are higher in saturated fat than mustard or sesame oil, but remain acceptable in a varied diet where they aren't the sole fat source used across every meal.",
    source: "IFCT 2017",
  },

  // --- Vitamins ---
  {
    id: "vit-1",
    category: "vitamins",
    content:
      "Vitamin B12 is found almost exclusively in animal-derived foods. Strict vegetarians who consume dairy get some B12 from milk, curd, and paneer, but vegans have no reliable dietary source and are at meaningfully higher risk of deficiency without supplementation.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "vit-2",
    category: "vitamins",
    content:
      "Vitamin D deficiency is common across India despite abundant sunlight, largely due to limited midday sun exposure and skin melanin reducing synthesis efficiency. Fortified milk, eggs, and supplementation are commonly recommended where levels are low.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "vit-3",
    category: "vitamins",
    content:
      "Vitamin C-rich foods — amla, citrus fruits, guava, bell peppers — significantly improve absorption of non-heme iron from plant foods like dal and leafy greens when eaten in the same meal.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "vit-4",
    category: "vitamins",
    content:
      "Folate (vitamin B9) is naturally present in leafy greens, lentils, and citrus fruits, and is especially important through pregnancy. ICMR-NIN specifically recommends increased folate intake for women who are pregnant or planning pregnancy.",
    source: "ICMR-NIN RDA 2020",
  },

  // --- Minerals ---
  {
    id: "min-1",
    category: "minerals",
    content:
      "Iron deficiency anemia is particularly common among Indian women, driven by a combination of menstrual iron loss and a diet where the primary iron sources are non-heme (plant-based) and less efficiently absorbed than heme iron from meat.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "min-2",
    category: "minerals",
    content:
      "Leafy greens (spinach, methi, amaranth), jaggery, and dals are the main vegetarian iron sources in Indian diets. Pairing them with a vitamin C source in the same meal meaningfully improves how much iron is actually absorbed.",
    source: "IFCT 2017",
  },
  {
    id: "min-3",
    category: "minerals",
    content:
      "Calcium needs can be met beyond milk through ragi (finger millet), sesame seeds (til), curd, and green leafy vegetables — ragi in particular has one of the highest calcium contents among commonly eaten Indian grains.",
    source: "IFCT 2017",
  },
  {
    id: "min-4",
    category: "minerals",
    content:
      "Tannins in tea and coffee, and phytates in whole grains and legumes, can inhibit calcium and iron absorption when consumed alongside calcium- or iron-rich foods. Spacing tea or coffee an hour away from meals reduces this effect.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "min-5",
    category: "minerals",
    content:
      "Iodine deficiency, once widespread in India, has been substantially reduced through mandatory iodization of table salt. Using iodized salt consistently remains an important safeguard against thyroid-related deficiency.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },

  // --- Diet plans / meal planning ---
  {
    id: "plan-1",
    category: "diet-plans",
    content:
      "A practical way to add roughly 30g of protein to a typical Indian meal is combining 100g paneer or a bowl of sprouts with the existing dal and roti — this alone can add 18-20g of protein without changing the meal's basic structure.",
    source: "IFCT 2017",
  },
  {
    id: "plan-2",
    category: "diet-plans",
    content:
      "Protein-rich Indian breakfast options include besan chilla, moong dal chilla, paneer bhurji, sprouts poha, and boiled eggs with multigrain toast — all deliver 15-20g or more of protein without straying from familiar breakfast formats.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "plan-3",
    category: "diet-plans",
    content:
      "Post-workout snack options that fit an Indian kitchen include a glass of milk with banana, roasted chana, curd with fruit, or a boiled egg. Combining a fast carbohydrate with 15-20g of protein within an hour or two of training supports recovery.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "plan-4",
    category: "diet-plans",
    content:
      "Batch-cooking dal, sprouts, or paneer once or twice a week is a practical way to keep protein intake consistent across a busy week without cooking a separate protein source at every single meal.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "plan-5",
    category: "diet-plans",
    content:
      "When eating out, choosing tandoori or grilled preparations over deep-fried or heavily battered ones, and asking for extra dal, paneer, or salad instead of extra rice or naan, are simple ways to shift a restaurant meal's macro balance.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "plan-6",
    category: "diet-plans",
    content:
      "ICMR-NIN estimated daily calorie needs range roughly from 1,900-2,100 kcal for a sedentary adult woman and 2,200-2,400 kcal for a sedentary adult man, increasing by several hundred kcal per day at higher activity levels.",
    source: "ICMR-NIN RDA 2020",
  },
  {
    id: "plan-7",
    category: "diet-plans",
    content:
      "RDA figures are population-level averages meant for broad planning; individual needs vary with age, muscle mass, activity, and specific goals like fat loss or muscle gain, so they're best treated as a starting reference rather than a strict, fixed target.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },

  // --- Vegetarian ---
  {
    id: "veg-1",
    category: "vegetarian",
    content:
      "A well-planned vegetarian diet can fully meet protein needs, but it typically requires more deliberate planning than a non-vegetarian diet, since plant proteins are generally less 'complete' and lower in density per 100g than meat, fish, or eggs.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "veg-2",
    category: "vegetarian",
    content:
      "Combining dal with rice, or roti (wheat) with rajma or chole (legumes), creates a more complete amino acid profile than either food eaten alone, since cereals and legumes tend to be low in complementary essential amino acids.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "veg-3",
    category: "vegetarian",
    content:
      "Vegan diets (no dairy or eggs) carry the highest risk of B12, and often iron, calcium, and omega-3 gaps among common Indian dietary patterns, and generally benefit from a B12 supplement plus deliberate attention to the other three.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "veg-4",
    category: "vegetarian",
    content:
      "Eggetarian diets (vegetarian plus eggs) close much of the protein-density gap versus a fully plant-based vegetarian diet, since two eggs alone add roughly 12g of complete protein for relatively few calories.",
    source: "IFCT 2017",
  },

  // --- Weight loss ---
  {
    id: "wl-1",
    category: "weight-loss",
    content:
      "A sustainable calorie deficit for fat loss is typically around 500 kcal/day below maintenance (TDEE), corresponding to roughly 0.5kg of fat loss per week. Larger deficits speed short-term loss but are harder to sustain and risk more muscle loss.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "wl-2",
    category: "weight-loss",
    content:
      "Protein intake becomes more important, not less, during a calorie deficit — adequate protein, toward the higher end of ICMR-NIN's active-adult range, helps preserve muscle mass while losing fat.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "wl-3",
    category: "weight-loss",
    content:
      "Fiber-rich foods (vegetables, whole grains, legumes) and protein both increase satiety per calorie compared to refined carbs and fried foods, making a calorie deficit easier to sustain without constant hunger.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "wl-4",
    category: "weight-loss",
    content:
      "Crash diets that cut calories very aggressively, well below BMR, often lead to rapid muscle loss, metabolic slowdown, and rebound weight regain, and are not recommended over a moderate, sustained deficit.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },

  // --- Weight gain ---
  {
    id: "wg-1",
    category: "weight-gain",
    content:
      "Healthy weight or muscle gain generally targets a calorie surplus of roughly 300-500 kcal/day above maintenance, paired with resistance training — a much larger surplus mostly adds fat rather than lean mass.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "wg-2",
    category: "weight-gain",
    content:
      "Calorie-dense, nutrient-rich additions like nuts, peanut butter, whole milk, paneer, and ghee are practical ways to raise total intake for weight gain without needing unusually large meal volumes.",
    source: "IFCT 2017",
  },
  {
    id: "wg-3",
    category: "weight-gain",
    content:
      "For weight gain, protein intake in the 1.4-1.6g/kg range alongside resistance training supports the surplus going toward muscle rather than primarily fat mass.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },

  // --- Indian foods (composition reference) ---
  {
    id: "food-1",
    category: "indian-foods",
    content:
      "A single roti (~40g) provides roughly 120 kcal, 3-4g protein, and 18-20g carbohydrate, while a katori of cooked rice (~150g) provides roughly 195 kcal and 40g carbohydrate with under 3g protein — roti offers modestly more protein per calorie than plain rice.",
    source: "IFCT 2017",
  },
  {
    id: "food-2",
    category: "indian-foods",
    content:
      "A katori (150g) of mixed vegetable sabzi typically provides 100-150 kcal depending on the oil used, and is a meaningful source of fiber, vitamin A, and vitamin C, but generally under 3-4g of protein.",
    source: "IFCT 2017",
  },
  {
    id: "food-3",
    category: "indian-foods",
    content:
      "Idli and dosa, made from fermented rice-lentil batter, are lighter and easier to digest than many fried breakfast items, and fermentation modestly improves the bioavailability of some nutrients compared to the raw batter.",
    source: "IFCT 2017",
  },
  {
    id: "food-4",
    category: "indian-foods",
    content:
      "Deep-fried snacks like samosa, pakora, and vada are calorie-dense mainly from the frying oil rather than the base ingredients — a single samosa (~50g) can carry 150-200 kcal, much of it fat.",
    source: "IFCT 2017",
  },

  // --- Myths ---
  {
    id: "myth-1",
    category: "myths",
    content:
      "\"Dal alone is enough protein for the day\" is a common misconception — a standard katori (150g) of cooked dal provides only around 7-9g of protein, well short of most adults' daily protein needs even across multiple servings.",
    source: "IFCT 2017",
  },
  {
    id: "myth-2",
    category: "myths",
    content:
      "\"Ghee is unhealthy and should be avoided\" is an oversimplification — moderate ghee (1-2 tsp per meal) fits within recommended fat intake and isn't inherently more harmful than other cooking fats; total calorie and overall fat quantity matter more than ghee specifically.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "myth-3",
    category: "myths",
    content:
      "\"Egg yolks are bad and should be discarded\" isn't well supported for most healthy adults — the yolk carries roughly half the egg's protein plus most of its vitamin A, D, and choline. Dietary cholesterol from eggs has a smaller effect on blood cholesterol for most people than once believed.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "myth-4",
    category: "myths",
    content:
      "\"Carbs are bad and should be cut out completely\" isn't supported by ICMR-NIN guidance — the real issue in most Indian diets is carb proportion and refined-carb quality, not carbohydrates as a category. A moderate, fiber-rich carb intake remains part of a balanced diet.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "myth-5",
    category: "myths",
    content:
      "\"Skipping meals helps with weight loss\" tends to backfire — it often leads to overeating at the next meal and makes it harder to hit daily protein targets, without meaningfully improving the calorie deficit compared to smaller, regular meals.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
  {
    id: "myth-6",
    category: "myths",
    content:
      "\"Fruit is unhealthy for weight loss because of its sugar\" is misleading — whole fruit's fiber content slows sugar absorption compared to fruit juice or added sugar, and fruit is far less calorie-dense than most processed sweet snacks per serving.",
    source: "ICMR-NIN Dietary Guidelines 2024",
  },
];
