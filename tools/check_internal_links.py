"""Check local HTML links, resources and fragments without external requests."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.links = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        for key in ('href', 'src'):
            if attrs.get(key):
                self.links.append(attrs[key])


def main():
    pages = {p: Page(p.read_text()) for p in ROOT.rglob('*.html') if '.git' not in p.parts}
    errors = []
    checked = 0
    for page, parsed in pages.items():
        for link in parsed.links:
            url = urlsplit(link)
            if url.netloc and url.hostname not in {'eddiesworld.de', 'www.eddiesworld.de'}:
                continue
            if url.scheme and url.scheme not in {'http', 'https'}:
                continue
            checked += 1
            path = unquote(url.path)
            target = (ROOT / path.lstrip('/') if path.startswith('/') else page.parent / path) if path else page
            target = target.resolve()
            if not target.is_relative_to(ROOT):
                errors.append(f'{page.relative_to(ROOT)}: outside checkout: {link}')
                continue
            if target.is_dir():
                target /= 'index.html'
            if not target.is_file():
                errors.append(f'{page.relative_to(ROOT)}: missing target: {link}')
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(f'{page.relative_to(ROOT)}: missing fragment: {link}')
    for error in errors:
        print(error)
    print(f'{len(pages)} HTML pages, {checked} internal references, {len(errors)} errors')
    return bool(errors)


if __name__ == '__main__':
    raise SystemExit(main())
