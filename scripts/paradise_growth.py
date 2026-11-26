"""Build character-specific Paradise routes from the guide's growth tables."""
from collections import defaultdict
from html import escape

from bs4 import BeautifulSoup


def growth_tables(source):
    guide = BeautifulSoup(source, "html.parser")
    routes = defaultdict(list)
    for field in guide.select("#guide .field"):
        field_name = field.h2.get_text(" ", strip=True)
        for route in field.select(".route"):
            stages = [s.get_text(strip=True) for s in route.select(".stage-name")]
            adults = route.select(".open-card")
            dishes = [d["data-food"] for d in route.select(".dish[data-food]")]
            planet = field.get("id") == "neon"
            place = route.b.get_text(strip=True).split(" · ")[0] if planet else field_name
            versions = route.get("data-exclusive") or field.get("data-devices", "").replace("|", " · ")
            for button in adults:
                name = button.get_text(strip=True)
                label = button.parent.select_one(".care-label")
                if planet:
                    care = "Условия ухода и корм пока не указаны."
                elif label:
                    care = label.get_text(strip=True).replace("5 🍙 и 5 ☀️", "по 5 полных пополнений сытости и счастья")
                    if care == "0–1 ошибка":
                        care += ". При нуле ошибок хотя бы одну шкалу заполни полностью меньше пяти раз."
                else:
                    care = route.get_text(" ", strip=True)
                rows = [("Версии", versions), ("Путь роста", " → ".join([*stages, name]) if stages else ""),
                        ("Корм на стадии Kid", ", ".join(dishes)), ("Условие", care)]
                body = "".join(f'<tr><th scope="row">{k}</th><td>{escape(v)}</td></tr>' for k,v in rows if v)
                table = f'<table><caption>{escape(place)}</caption><tbody>{body}</tbody></table>'
                for member in set([name, *stages]):
                    routes[member].append(table)
    return {name: '<details class="paradise-growth"><summary>Таблица роста в Paradise</summary><div>' +
            "".join(tables) + '</div></details>' for name,tables in routes.items()}
