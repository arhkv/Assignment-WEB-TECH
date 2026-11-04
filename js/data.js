/* ==========================================================
   Dark Essence - product data (Assignment 5)
   Objects + methods + arrays. Loaded BEFORE script.js.
   ========================================================== */

// A Product is an object with its own data and methods.
class Product {
    constructor(id, brand, name, category, volume, price, image, notes) {
        this.id = id;
        this.brand = brand;
        this.name = name;
        this.category = category; // "Men" | "Women" | "Unisex"
        this.volume = volume;     // ml
        this.price = price;       // USD
        this.image = image;
        this.notes = notes;
    }

    // Full title, e.g. "Tom Ford - Ombre Leather"
    getTitle() {
        return `${this.brand} \u2014 ${this.name}`;
    }

    // "$210"
    getFormattedPrice() {
        return `$${this.price}`;
    }

    // Used by the search field: does the text appear in brand or name?
    matchesSearch(text) {
        const query = text.trim().toLowerCase();
        return this.getTitle().toLowerCase().includes(query);
    }
}

// The catalog is an array of Product objects.
const products = [
    new Product(1, 'Tom Ford', 'Ombre Leather', 'Men', 100, 210, 'images/tomford.jfif', 'Saffron, leather, amber'),
    new Product(2, 'Dior', 'Sauvage Elixir', 'Men', 60, 180, 'images/dior.jfif', 'Cinnamon, lavender, licorice'),
    new Product(3, 'Creed', 'Aventus', 'Men', 100, 365, 'images/creed.jfif', 'Pineapple, birch, musk'),
    new Product(4, 'Chanel', 'Bleu de Chanel', 'Men', 100, 160, 'images/Chanel.jfif', 'Citrus, incense, cedar'),
    new Product(5, 'Byredo', 'Blanche', 'Women', 50, 195, 'images/blanche.jfif', 'White rose, violet, musk'),
    new Product(6, 'Yves Saint Laurent', 'Black Opium', 'Women', 90, 150, 'images/blackopium.jfif', 'Coffee, jasmine, vanilla'),
    new Product(7, 'Tom Ford', 'Lost Cherry', 'Women', 50, 395, 'images/tomfordnew.jfif', 'Black cherry, almond, tonka'),
    new Product(8, 'Yves Saint Laurent', 'Libre', 'Women', 90, 140, 'images/Libre.jfif', 'Lavender, orange blossom, vanilla'),
    new Product(9, 'Maison Francis Kurkdjian', 'Baccarat Rouge 540', 'Unisex', 70, 325, 'images/Baccarat.jfif', 'Saffron, amberwood, cedar')
];

// Greetings by time of day. Each period has a text and a fragrance tip.
const dayPeriods = {
    morning:   { greeting: 'Good morning',   tip: 'Start the day fresh: try citrus and light musks like Blanche.' },
    afternoon: { greeting: 'Good afternoon', tip: 'Bright and clean for the afternoon: Bleu de Chanel or Libre.' },
    evening:   { greeting: 'Good evening',   tip: 'Evenings call for depth: Ombre Leather or Black Opium.' },
    night:     { greeting: 'Good night',     tip: 'Late hours suit warm, sweet scents like Lost Cherry.' }
};
