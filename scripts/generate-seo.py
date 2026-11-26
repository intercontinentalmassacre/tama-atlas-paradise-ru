"""Generate crawlable wiki articles, catalog pages and sitemap from the atlas data."""

from paradise_growth import growth_tables

import json
import re
from html import escape
from itertools import groupby
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

DIST = Path(__file__).resolve().parents[1] / "dist"
ORIGIN = "https://tamawikia.ru"
BRAND = "Атлас тамагочи"
CATALOGS = {
    "character": ("/characters.html", "Персонажи тамагочи", "Персонажи Tamagotchi по алфавиту: имена на русском и английском, биографии и связанные устройства."),
    "device": ("/devices.html", "Устройства тамагочи", "Устройства Tamagotchi по алфавиту: Tamagotchi Paradise, Uni, Pix, Connection и другие модели Bandai."),
}


def article_path(entry):
    return "/wiki/" + entry["id"] + ".html"


def display_name(entry):
    title, ru = entry["title"], entry["ru"]
    return f"{ru} ({title})" if ru and ru.casefold() != title.casefold() else title


def asset_url(value, fallback=""):
    if not value:
        return fallback
    if value.startswith("https://") and urlsplit(value).netloc:
        return value
    if re.fullmatch(r"[a-zA-Z0-9/_-][a-zA-Z0-9/_.-]*", value) and (DIST / value.lstrip("/")).is_file():
        return "/" + value.lstrip("/")
    return fallback


def page_metadata(path, title, description, image="/tamawiki.webp", kind="website"):
    url = ORIGIN + path
    image_url = image if image.startswith("https://") else ORIGIN + image
    properties = {
        "og:type": kind,
        "og:locale": "ru_RU",
        "og:site_name": BRAND,
        "og:url": url,
        "og:title": title,
        "og:description": description,
        "og:image": image_url,
    }
    tags = [
        f"<title>{escape(title)}</title>",
        f'<meta name="description" content="{escape(description)}">',
        f'<link rel="canonical" href="{escape(url)}">',
    ]
    tags.extend(f'<meta property="{key}" content="{escape(value)}">' for key, value in properties.items())
    tags.append('<meta name="twitter:card" content="summary">')
    return "\n".join(tags)


def schema(kind, **fields):
    payload = {"@context": "https://schema.org", "@type": kind, "inLanguage": "ru", **fields}
    encoded = json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c")
    return f'<script type="application/ld+json">{encoded}</script>'


def page(path, title, description, body, image="/tamawiki.webp", kind="website", structured=""):
    metadata = page_metadata(path, title, description, image, kind)
    return f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
{metadata}
<link rel="stylesheet" href="/wiki/reading.css">
{structured}
<script defer src="/tama-run.js"></script></head>
<body>
<a class="skip" href="#content">К содержанию</a>
<header>
  <a class="brand" href="/"><img src="/tamawiki.webp" width="156" height="52" alt="{BRAND}"></a>
  <nav aria-label="Разделы атласа">
    <a href="/characters.html">Персонажи</a>
    <a href="/devices.html">Устройства</a>
    <a href="/#guide">Мой Paradise</a>
    <a href="/beginners.html">С чего начать</a>
  </nav>
</header>
<main id="content">
{body}
</main>
<footer>Русскоязычный фанатский атлас Tamagotchi</footer>
</body>
</html>
"""


def entry_link(entry):
    return f'<a href="{article_path(entry)}">{escape(display_name(entry))}</a>'


def block_kind(tag):
    if tag == "li":
        return "list"
    if tag == "row":
        return "table"
    return "text"


def render_blocks(blocks):
    for kind, rows in groupby(blocks, key=lambda block: block_kind(block["tag"])):
        if kind == "list":
            yield "<ul>" + "".join(f'<li>{escape(row["text"])}</li>' for row in rows if row.get("text")) + "</ul>"
        elif kind == "table":
            yield '<div class="table"><table><tbody>'
            for row in rows:
                cells = row.get("cells") or re.split(r"\s+[|│]\s+", row.get("text", ""))
                yield "<tr>" + "".join(f"<td>{escape(str(cell))}</td>" for cell in cells) + "</tr>"
            yield "</tbody></table></div>"
        else:
            for row in rows:
                if not row.get("text"):
                    continue
                tag = row["tag"]
                if tag == "h1":
                    tag = "h2"
                if tag not in ("h2", "h3", "h4", "h5"):
                    tag = "p"
                yield f'<{tag}>{escape(row["text"])}</{tag}>'


def gallery_sections(blocks):
    body, captions = [], {}
    level = None
    group = ""
    for block in blocks:
        tag, label = block["tag"], block.get("text", "").strip()
        depth = int(tag[1]) if re.fullmatch(r"h[1-5]", tag) else None
        if depth and level and depth <= level:
            level = None
        if depth and label.casefold() in ("галерея", "gallery"):
            level, group = depth, ""
            continue
        if level and depth:
            group = label
            continue
        if level and tag == "caption":
            if group:
                captions.setdefault(label.casefold(), group)
            continue
        if level and label.startswith("См.") and "галер" in label.casefold():
            continue
        body.append(block)
    return body, captions


def gallery_category(photo, captions):
    caption = photo.get("caption", "").casefold()
    if caption in captions:
        return captions[caption]
    source = photo.get("file", "").split("/")[-1].casefold()
    if photo.get("sprite"):
        return "Игровые спрайты"
    if re.search(r"^(?:file:)?(?:emergency|djmametchi|tbgp)\d", source):
        return "Анимация"
    if re.search(r"gameplay|appmedia|al-gest", photo.get("file", ""), re.I):
        return "Игры"
    if re.search(r"sticker|lanyard", source):
        return "Сувениры и товары"
    if re.search(r"card_tmgc|trading.card", source):
        return "Коллекционные карточки"
    if re.search(r"artwork|_art[._]|иллюстраци", source + " " + caption):
        return "Иллюстрации"
    return ""


def gallery_html(doc, entry, captions):
    pictures = []
    for photo in doc.get("gallery", [])[:12]:
        thumb = asset_url(photo.get("src")) or asset_url(photo.get("remote"))
        if not thumb:
            continue
        full = asset_url(photo.get("large")) or thumb
        caption = escape(photo.get("caption") or display_name(entry))
        pictures.append(f'<figure><a href="{escape(full)}"><img src="{escape(thumb)}" alt="{caption}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a><figcaption>{caption}</figcaption></figure>')
    if not pictures:
        return ""
    link = f'<a data-page="/{escape(entry["article"])}" href="/?view=reader#wiki/{entry["id"]}">Показать ещё · всего {len(doc["gallery"])}</a>' if len(doc["gallery"]) > 12 else ""
    groups = {}
    for index, photo in enumerate(doc["gallery"]):
        category = gallery_category(photo, captions)
        groups.setdefault(category or "Другие изображения", []).append(index)
    filters = ""
    if len(groups) > 1:
        buttons = [f'<button type="button" aria-pressed="true" data-set="all">Все · {len(doc["gallery"])}</button>']
        for label, indices in groups.items():
            numbers = ",".join(map(str, indices))
            buttons.append(f'<button type="button" aria-pressed="false" data-set="{numbers}">{escape(label)} · {len(indices)}</button>')
        filters = '<div class="album-filters" role="group" aria-label="Категории изображений" hidden>' + "".join(buttons) + "</div>"
    return f'<section id="gallery" data-source="/{escape(entry["article"])}"><h2>Галерея <small>{len(doc["gallery"])}</small></h2>{filters}<div class="article-gallery">{"".join(pictures)}</div>{link}</section><script defer src="/wiki/gallery-more.js"></script>' 


def article(entry, records, paradise_ids, growth):
    doc = json.loads((DIST / entry["article"]).read_text())
    path = article_path(entry)
    name = display_name(entry)
    subheading = "Устройство Tamagotchi" if entry["kind"] == "device" else "Персонаж Tamagotchi"
    title = f"{name} — {subheading.lower()} | {BRAND}" if entry["kind"] == "character" else f"{name} — обзор устройства | {BRAND}"
    description = entry["intro"]
    if len(description) > 175:
        description = description[:172].rsplit(" ", 1)[0] + "…"
    image = asset_url(entry.get("image"))
    portrait = f'<img class="portrait" src="{escape(image)}" alt="{escape(name)}">' if image else ""
    topic = "Читать с галереей в атласе" if doc.get("gallery") else "Открыть в интерактивном атласе"
    catalog_url, catalog, _ = CATALOGS[entry["kind"]]
    back = f'<a href="{catalog_url}">{catalog}</a>'
    suffix = f" ({entry['title']})"
    hero_name = (escape(name[:-len(suffix)]) + f" <em>{escape(entry['title'])}</em>"
                 if name.endswith(suffix) else escape(name))
    growth_panel = growth.get(entry["title"], "") if entry["kind"] == "character" else ""
    extras = ""
    if entry["id"] in paradise_ids:
        extras = '<li><a href="/beginners.html">Первый запуск и уход в Tamagotchi Paradise</a></li>'
        if entry["kind"] == "device":
            extras += '<li><a href="/#guide">Таблицы роста и питания в «Мой Paradise»</a></li>'
        elif not growth_panel:
            growth_panel = '<details class="paradise-growth"><summary>Рост в Paradise</summary><div>В справочнике пока нет отдельной схемы роста для этого персонажа.</div></details>'
    related = []
    seen = {entry["id"]}
    for row in doc.get("related", ()):
        item = records.get(row.get("id"))
        if item is None or item["id"] in seen:
            continue
        seen.add(item["id"])
        note = " · " + escape(row["note"]) if row.get("note") else ""
        related.append("<li>" + entry_link(item) + note + "</li>")
    connected = ""
    if related:
        heading = "Устройства с этим персонажем" if entry["kind"] == "character" else "Персонажи устройства"
        connected = f"<section><h2>{heading}</h2><ul class=\"related\">{''.join(related)}</ul></section>"
    credit = []
    if doc.get("url", "").startswith("https://"):
        original = urlsplit(doc["url"])
        query = urlencode([*parse_qsl(original.query), ("action", "history")])
        history = urlunsplit(original._replace(query=query))
        credit.append(f'Машинный перевод статьи участников Tamagotchi Wiki с редакторскими правками. <a href="{escape(doc["url"])}">Исходная статья</a> · <a href="{escape(history)}">История правок</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>')
    if doc.get("imageSource", "").startswith("https://"):
        credit.append(f'<a href="{escape(doc["imageSource"])}">Источник портрета</a>')
    credits = '<p class="credit">' + " · ".join(credit) + "</p>" if credit else ""
    blocks, captions = gallery_sections(doc["blocks"])
    intro = ""
    if blocks and blocks[0]["tag"] == "p" and len(blocks[0].get("text", "")) <= 420:
        intro = "<p class='lead'>" + escape(blocks.pop(0)["text"]) + "</p>"
    text = "".join(render_blocks(blocks))
    gallery = gallery_html(doc, entry, captions)
    links = []
    def anchor(match):
        label = match.group(1)
        target = f"section-{len(links) + 1}"
        links.append(f'<a href="#{target}">{label}</a>')
        return f'<h2 id="{target}">{label}</h2>'
    text = re.sub(r"<h2>(.*?)</h2>", anchor, text)
    contents = '<nav class="contents" aria-label="В этой статье"><strong>В этой статье</strong>' + "".join(links) + "</nav>" if links else ""
    art = f'<div class="hero-art">{portrait}</div>' if portrait else ""
    body = f"""<p class="crumb">{back}</p>
<article>
<div class="article-head"><div class="hero-copy"><p class="kind">{subheading}</p><h1>{hero_name}</h1>{intro}<ul class="actions">{'<li><a href="#gallery">К галерее</a></li>' if gallery else ""}<li><a href="/#{'devices' if entry['kind'] == 'device' else 'characters'}" data-atlas-return>{'К устройствам' if entry['kind'] == 'device' else 'К персонажам'}</a></li>{extras}</ul>{growth_panel}</div>{art}</div>
<div class="reading-layout">{contents}<div class="story">{text}{connected}{credits}</div></div>
{gallery}
</article>"""
    structured = schema("Article", headline=name, description=description, url=ORIGIN + path,
                        mainEntityOfPage=ORIGIN + path, **({"image": [image if image.startswith("https://") else ORIGIN + image]} if image else {}))
    return page(path, title, description, body, image or "/tamawiki.webp", "article", structured)


def catalog(kind, entries):
    path, heading, description = CATALOGS[kind]
    entries = sorted(entries, key=lambda entry: (entry["ru"] or entry["title"]).casefold().replace("ё", "е"))
    groups = {}
    for entry in entries:
        initial = (entry["ru"] or entry["title"])[0].upper()
        groups.setdefault(initial if initial.isalnum() else "Другие", []).append(entry)
    jumps = "".join(f'<a href="#letter-{i}">{escape(letter)}</a>' for i, letter in enumerate(groups))
    sections = []
    for i, (letter, items) in enumerate(groups.items()):
        links = "".join(f"<li>{entry_link(item)}</li>" for item in items)
        sections.append(f'<section id="letter-{i}"><h2>{escape(letter)}</h2><ul class="entries">{links}</ul></section>')
    tab = "characters" if kind == "character" else "devices"
    content = f"""<h1>{heading}</h1>
<p>{description}</p>
<p><a href="/#{tab}">Открыть каталог с поиском и фильтрами</a></p>
<nav class="alphabet" aria-label="Алфавитный указатель">{jumps}</nav>
{"".join(sections)}"""
    return page(path, f"{heading} — полный каталог Tamagotchi | {BRAND}", description, content,
                structured=schema("CollectionPage", name=heading, url=ORIGIN + path, description=description))


def main():
    entries = json.loads((DIST / "wiki/index.json").read_text())
    records = {entry["id"]: entry for entry in entries}
    paradise = next(entry for entry in entries if entry["title"] == "Tamagotchi Paradise" and entry["kind"] == "device")
    paradise_doc = json.loads((DIST / paradise["article"]).read_text())
    paradise_ids = {paradise["id"], *(row["id"] for row in paradise_doc.get("related", ()))}
    growth = growth_tables((DIST / "index.html").read_text(encoding="utf8"))
    for kind, (path, _, _) in CATALOGS.items():
        (DIST / path[1:]).write_text(catalog(kind, [entry for entry in entries if entry["kind"] == kind]))
    for entry in entries:
        (DIST / article_path(entry)[1:]).write_text(article(entry, records, paradise_ids, growth))
    paths = ["/", "/beginners.html", *(config[0] for config in CATALOGS.values()), *(article_path(entry) for entry in entries)]
    sitemap = "".join(f"  <url><loc>{escape(ORIGIN + path)}</loc></url>\n" for path in paths)
    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + sitemap + "</urlset>\n"
    )
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {ORIGIN}/sitemap.xml\n")


if __name__ == "__main__":
    main()
