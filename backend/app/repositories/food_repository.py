from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.food_item import FoodItem

FOOD_SEARCH_ALIASES: dict[str, list[str]] = {
    "anda": ["egg", "boiled egg", "egg bhurji"],
    "bhindi": ["okra"],
    "chai": ["tea"],
    "chapati": ["chapati", "roti"],
    "chawal": ["rice", "white rice", "basmati rice", "brown rice"],
    "dahi": ["curd", "greek yogurt"],
    "doodh": ["milk"],
    "groundnut": ["peanuts"],
    "murg": ["chicken breast", "chicken curry"],
    "murgh": ["chicken breast", "chicken curry"],
    "paneer": ["paneer", "paneer tikka", "palak paneer"],
    "rice": ["rice", "white rice", "brown rice", "basmati rice", "fried rice"],
    "roti": ["roti", "chapati"],
    "sabzi": ["mixed vegetable sabzi", "vegetable curry"],
}


class FoodRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, food_item_id: int) -> FoodItem | None:
        return self.db.get(FoodItem, food_item_id)

    def get_by_name(self, name: str) -> FoodItem | None:
        statement = select(FoodItem).where(func.lower(FoodItem.name) == name.lower())
        return self.db.scalars(statement).first()

    def list_all(self) -> list[FoodItem]:
        statement = select(FoodItem).order_by(FoodItem.name)
        return list(self.db.scalars(statement).all())

    def search(self, query: str) -> list[FoodItem]:
        normalized_query = query.strip().lower()
        if not normalized_query:
            return self.list_all()

        search_terms = {normalized_query, *FOOD_SEARCH_ALIASES.get(normalized_query, [])}
        statement = (
            select(FoodItem)
            .order_by(FoodItem.name)
        )
        foods = list(self.db.scalars(statement).all())

        return [
            food
            for food in foods
            if any(
                term in food.name.lower()
                or term in _aliases_for_search(food.aliases)
                for term in search_terms
            )
        ]

    def create_custom(self, food_data: dict[str, object]) -> FoodItem:
        name = str(food_data["name"]).strip()
        existing_food = self.get_by_name(name)
        if existing_food is not None:
            return existing_food

        aliases = _normalize_aliases(food_data.get("aliases", []), name)
        food_item = FoodItem(
            aliases=aliases,
            calories_per_serving=float(food_data["calories_per_serving"]),
            carbs_g=float(food_data["carbs_g"]),
            fats_g=float(food_data["fats_g"]),
            is_custom=True,
            name=name,
            protein_g=float(food_data["protein_g"]),
            serving_unit=str(food_data["serving_unit"]).strip(),
        )
        self.db.add(food_item)
        self.db.commit()
        self.db.refresh(food_item)
        return food_item

    def create_many_if_missing(self, food_items: list[dict[str, object]]) -> None:
        existing_foods = {
            food.name.lower(): food
            for food in self.db.scalars(select(FoodItem)).all()
        }

        for item in food_items:
            name = str(item["name"])
            aliases = _normalize_aliases(item.get("aliases", []), name)
            existing_food = existing_foods.get(name.lower())
            if existing_food is not None:
                if aliases and existing_food.aliases != aliases:
                    existing_food.aliases = aliases
                continue

            prepared_item = {
                **item,
                "aliases": aliases,
                "is_custom": bool(item.get("is_custom", False)),
            }
            food_item = FoodItem(**prepared_item)
            self.db.add(food_item)
            existing_foods[name.lower()] = food_item

        self.db.commit()


def _normalize_aliases(value: object, name: str) -> str:
    if isinstance(value, str):
        aliases = [alias.strip() for alias in value.split(",")]
    elif isinstance(value, list):
        aliases = [str(alias).strip() for alias in value]
    else:
        aliases = []

    aliases = [alias for alias in aliases if alias]
    if name not in aliases:
        aliases.insert(0, name)
    return ",".join(dict.fromkeys(aliases))


def _aliases_for_search(value: str) -> str:
    return " ".join(alias.strip().lower() for alias in value.split(","))
