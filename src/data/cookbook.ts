import type { Recipe } from "../types/recipe";
import item0 from "./recipes/lemon-garlic-pasta.json";
import item1 from "./recipes/sheet-pan-chicken-potatoes.json";
import item2 from "./recipes/black-bean-quesadillas.json";
import item3 from "./recipes/tomato-chickpea-skillet.json";
import item4 from "./recipes/ginger-tofu-rice-bowls.json";
import item5 from "./recipes/turkey-spinach-meatballs.json";
import item6 from "./recipes/roasted-vegetable-couscous.json";
import item7 from "./recipes/mushroom-risotto.json";
import item8 from "./recipes/salmon-green-beans.json";
import item9 from "./recipes/sweet-potato-lentil-curry.json";

/** Sample files only — the app does not yet support household authentication. */
const recipes: Recipe[] = [
  item0, item1, item2, item3, item4, item5, item6, item7, item8, item9
];

export function getAllRecipes(): Recipe[] {
  return [...recipes];
}

export function getRecipeById(id: string): Recipe | undefined {
  return recipes.find((recipe) => recipe.id === id);
}
