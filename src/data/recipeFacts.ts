import type { DietaryNeed } from "../types/profile";

/** Manually classified demo metadata; never a food-safety certification. */
export type DietaryStatus = "no-known-conflict" | "conflict" | "review";
export type IngredientFact = {
  label: string;
  aliases: string[];
  groups: string[];
};
export type RecipeFacts = {
  ingredients: IngredientFact[];
  dietary: Record<DietaryNeed, DietaryStatus>;
  notes: Partial<Record<DietaryNeed, string>>;
};
const i = (label: string, aliases: string[] = [], groups: string[] = []): IngredientFact =>
  ({ label, aliases, groups });
export const recipeFacts: Record<string, RecipeFacts> = {
  "lemon-garlic-pasta": {
    ingredients: [
      i("spaghetti", ["pasta", "noodles"], ["wheat", "gluten"]),
      i("olive oil", ["oil"]), i("garlic", ["garlic cloves"]),
      i("lemon", ["lemon juice", "lemon zest"]), i("Parmesan", ["parmesan cheese", "cheese"], ["dairy", "milk"]),
      i("parsley"), i("salt"), i("black pepper", ["pepper"]),
    ],
    dietary: { vegetarian: "review", vegan: "conflict", "gluten-free": "conflict" },
    notes: {
      vegetarian: "Parmesan may use animal rennet; check the cheese.",
      vegan: "Parmesan is dairy cheese.",
      "gluten-free": "The sample calls for wheat spaghetti.",
    },
  },
  "sheet-pan-chicken-potatoes": {
    ingredients: [
      i("chicken thighs", ["chicken"], ["poultry", "meat"]),
      i("potatoes", ["potato", "baby potatoes"]), i("broccoli", ["broccoli florets"]),
      i("olive oil", ["oil"]), i("smoked paprika", ["paprika"]), i("oregano"),
      i("garlic powder", ["garlic"]), i("salt"), i("black pepper", ["pepper"]),
    ],
    dietary: { vegetarian: "conflict", vegan: "conflict", "gluten-free": "review" },
    notes: {
      vegetarian: "Contains chicken.",
      vegan: "Contains chicken.",
      "gluten-free": "No obvious wheat ingredient listed; verify spice labels and handling.",
    },
  },
  "black-bean-quesadillas": {
    ingredients: [
      i("flour tortillas", ["tortillas", "tortilla"], ["wheat", "gluten"]),
      i("black beans", ["beans", "black bean"]),
      i("cheddar cheese", ["cheddar", "cheese"], ["dairy", "milk"]),
      i("scallions", ["green onions", "spring onions"]), i("cumin"),
      i("olive oil", ["oil"]), i("salsa"),
    ],
    dietary: { vegetarian: "review", vegan: "conflict", "gluten-free": "conflict" },
    notes: {
      vegetarian: "Check cheddar's rennet source.",
      vegan: "Cheddar is dairy cheese.",
      "gluten-free": "Flour tortillas generally contain wheat.",
    },
  },
  "tomato-chickpea-skillet": {
    ingredients: [
      i("olive oil", ["oil"]), i("yellow onion", ["onion", "onions"]),
      i("garlic"), i("chickpeas", ["chickpea", "garbanzo beans"]),
      i("crushed tomatoes", ["tomatoes", "tomato"]), i("spinach"), i("oregano"),
      i("salt"), i("black pepper", ["pepper"]),
      i("crusty bread", ["bread"], ["wheat", "gluten"]),
    ],
    dietary: { vegetarian: "no-known-conflict", vegan: "no-known-conflict", "gluten-free": "conflict" },
    notes: { "gluten-free": "Crusty bread is included in the original serving suggestion." },
  },
  "ginger-tofu-rice-bowls": {
    ingredients: [
      i("jasmine rice", ["rice"]), i("tofu", ["bean curd"], ["soy", "soybeans"]),
      i("bell pepper", ["red bell pepper", "red pepper", "peppers"]),
      i("broccoli"), i("neutral oil", ["oil", "cooking oil"]),
      i("soy sauce", ["soy sauce"], ["soy", "soybeans", "wheat", "gluten"]),
      i("honey"), i("ginger"), i("garlic"), i("cornstarch", ["corn starch", "corn"]),
      i("water"),
    ],
    dietary: { vegetarian: "no-known-conflict", vegan: "conflict", "gluten-free": "conflict" },
    notes: {
      vegan: "Contains honey.",
      "gluten-free": "Standard soy sauce may contain wheat; verify product label.",
    },
  },
  "turkey-spinach-meatballs": {
    ingredients: [
      i("ground turkey", ["turkey"], ["poultry", "meat"]),
      i("spinach"), i("breadcrumbs", ["bread crumbs"], ["wheat", "gluten"]),
      i("egg", ["eggs"]), i("Parmesan", ["parmesan cheese", "cheese"], ["dairy", "milk"]),
      i("Italian seasoning", ["herbs"]), i("salt"),
      i("marinara sauce", ["marinara", "tomato sauce"]),
      i("spaghetti", ["pasta", "noodles"], ["wheat", "gluten"]),
    ],
    dietary: { vegetarian: "conflict", vegan: "conflict", "gluten-free": "conflict" },
    notes: {
      vegetarian: "Contains turkey.",
      vegan: "Contains turkey, egg and cheese.",
      "gluten-free": "Includes breadcrumbs and spaghetti.",
    },
  },
  "roasted-vegetable-couscous": {
    ingredients: [
      i("zucchini", ["courgette"]), i("bell pepper", ["red bell pepper", "pepper"]),
      i("red onion", ["onion", "onions"]), i("olive oil", ["oil"]),
      i("salt"), i("couscous", ["wheat couscous"], ["wheat", "gluten"]),
      i("vegetable broth", ["broth", "stock"]),
      i("chickpeas", ["chickpea", "garbanzo beans"]),
      i("lemon juice", ["lemon"]), i("parsley"),
    ],
    dietary: { vegetarian: "no-known-conflict", vegan: "no-known-conflict", "gluten-free": "conflict" },
    notes: { "gluten-free": "Couscous is generally made from wheat." },
  },
  "mushroom-risotto": {
    ingredients: [
      i("Arborio rice", ["rice", "risotto rice"]),
      i("cremini mushrooms", ["mushrooms", "mushroom"]), i("shallot", ["shallots", "onion"]),
      i("olive oil", ["oil"]), i("butter", ["unsalted butter"], ["dairy", "milk"]),
      i("vegetable broth", ["broth", "stock"]),
      i("Parmesan", ["parmesan cheese", "cheese"], ["dairy", "milk"]),
      i("salt"), i("black pepper", ["pepper"]),
    ],
    dietary: { vegetarian: "review", vegan: "conflict", "gluten-free": "review" },
    notes: {
      vegetarian: "Parmesan may contain animal rennet.",
      vegan: "Contains butter and Parmesan.",
      "gluten-free": "Check packaged broth and other ingredient labels.",
    },
  },
  "salmon-green-beans": {
    ingredients: [
      i("salmon", ["salmon fillets"], ["fish", "seafood"]),
      i("green beans", ["green bean", "beans"]), i("olive oil", ["oil"]),
      i("salt"), i("black pepper", ["pepper"]),
      i("Greek yogurt", ["yogurt", "plain yogurt"], ["dairy", "milk"]),
      i("dill"), i("lemon juice", ["lemon"]), i("garlic"),
    ],
    dietary: { vegetarian: "conflict", vegan: "conflict", "gluten-free": "review" },
    notes: {
      vegetarian: "Contains salmon.",
      vegan: "Contains salmon and yogurt.",
      "gluten-free": "Verify yogurt and other product labels and preparation.",
    },
  },
  "sweet-potato-lentil-curry": {
    ingredients: [
      i("neutral oil", ["oil", "cooking oil"]), i("yellow onion", ["onion", "onions"]),
      i("garlic"), i("ginger"), i("curry powder", ["curry spice"]),
      i("sweet potato", ["sweet potatoes", "potato"]), i("red lentils", ["lentils", "lentil"]),
      i("coconut milk", ["coconut"], ["coconut"]),
      i("water"), i("salt"), i("lime", ["lime juice"]), i("cilantro", ["coriander leaf"]),
    ],
    dietary: { vegetarian: "no-known-conflict", vegan: "no-known-conflict", "gluten-free": "review" },
    notes: { "gluten-free": "Check curry powder and packaged coconut milk labels." },
  },
};
