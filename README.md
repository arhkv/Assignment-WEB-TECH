# Dark Essence Perfumery

A multi-page showcase website for a niche perfume store, built in a **Dark Minimalist** style: dark background, gold accents, nothing extra. A university project for the Web Technologies course, group **SE-2505**.

## About the project

Dark Essence is a fictional store of niche fragrances. The site presents the catalog (men's and women's collections), prices, brands, contacts and delivery terms. It is built with plain HTML and CSS, and Bootstrap 5 is used on some pages (carousel, buttons, grid).

## Team

| Rymbek Beknur | Frontend Developer | Dark Minimalist design concept, project architecture, base CSS styles |
| Matzhan Arlan | Content Manager | Selected the product range, wrote descriptions for the men's and women's collections |
| Arman Sultangaliev | Analyst | Market research, price list, list of brands |
| Meirambek Samenkhan | Logistics & Communications Manager | Feedback form, delivery and office page |

## Project structure


-Assignment-WEB-TECH-main/
-index.html           # Home
-about.html           # About us and team
-catalog-men.html     # Men's collection
-catalog-women.html   # Women's collection
-pricing.html         # Price list (table)
-brands.html          # Top brands
-contact.html         # Contacts
-delivery.html        # Delivery, office, order form
-cards.html           # Responsive cards
-gallery.html         # Gallery with hover captions + carousel
-typography.html      # Responsive typography
-css/
 -style.css        # Single stylesheet
-images/              # Fragrance photos and team member photos


## Pages and what is implemented

- **Home** — heading, tagline and a main image with perfume bottles.
- **About** — store description and cards for the four team members with round photos (`.profile-img`) and roles.
- **Men's / Women's collections** — fragrance cards with a photo, a description and a list of notes (top, middle, base). Each collection has three fragrances:
  - men's: Tom Ford Ombre Leather, Dior Sauvage Elixir, Creed Aventus;
  - women's: Byredo Blanche, YSL Black Opium, Maison Francis Kurkdjian Baccarat Rouge 540.
- **Pricing** — an HTML table: brand, fragrance, category, volume (ml), price in dollars.
- **Brands** — an ordered list (`<ol>`): Tom Ford, Byredo, Le Labo, Maison Francis Kurkdjian, Kilian.
- **Contacts** — phone/WhatsApp numbers of the team (`tel:` links) and Instagram.
- **Delivery** — office address in Astana, working hours, courier delivery terms and an **order form**: text fields, email, a dropdown for the delivery method, radio buttons for delivery time, a comment field and a submit button. Fields use the `required` attribute and the email is validated by the browser.
- **Cards** — product cards: 3 per row on desktop, 2 on tablet, 1 on mobile (CSS media queries only).
- **Gallery** — a grid of 9 photos (`<figure>` + `<figcaption>`); the caption appears on hover or keyboard focus (`tabindex="0"`), with a Bootstrap carousel below.
- **Typography** — font size changes with screen width: small up to 767px, medium from 768 to 1199px, large from 1200px.

## How it is built

### Markup
- Semantic tags: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<figure>`, `<footer>`.
- Shared navigation on every page, `lang="ru"` and `meta viewport` for responsiveness.
- Pages are linked with relative links, and all images have `alt` text.

### Styles (`css/style.css`)
- **CSS variables** in `:root` for colors (`--bg`, `--surface`, `--gold`, `--gold-dark`, `--text`, `--muted`, `--line`) and the spacing `--gap`, so the theme can be changed in one place.
- **Palette:** background `#121212`, cards `#1a1a1a`, gold `#cda434`, text `#f5f4ef`.
- **Layout:** CSS Grid with `header`, `sidebar`, `main` and `footer` areas; the navigation uses Flexbox.
- **Components:** `.card`, `.product-card` (hover effect and gold border), `.btn` / `.btn-submit`, `.profile-img`, `.gallery`, `.brand-list` with a counter, `.team-row`.
- **Responsiveness:** media queries for cards and typography; images use `max-width: 100%`.
- Button styles are aligned with Bootstrap through the `--bs-btn-*` variables.

### Technologies
- HTML5, CSS3 (Grid, Flexbox, custom properties, media queries)
- Bootstrap 5 (carousel on the gallery page, buttons, utilities)
- No custom JavaScript, only what Bootstrap includes

## Running the project

No build step is needed. Download or clone the repository and open `index.html` in a browser. For convenient development you can use the Live Server extension in VS Code.

> Images are stored in `.jfif` format, so the paths must match the file names in `images/` exactly (including letter case).

## Group and authors

Group **SE-2505**: Rymbek Beknur, Matzhan Arlan, Arman Sultangaliev, Meirambek Samenkhan.
