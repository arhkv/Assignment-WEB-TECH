/* ==========================================================
   Dark Essence - main script (Assignment 4 + Assignment 5)
   Sections:
     0. Helpers (safe storage)
     1. Sound effects (Web Audio API, no overlapping)
     2. Day / Night theme
     3. Date & time, random background        (Assignment 4)
     4. Accordion, popup, form validation     (Assignment 4)
     5. Greeting by time of day (switch)
     6. Star rating (querySelectorAll)
     7. Keyboard: menu arrows + shortcuts (switch)
     8. Contact form with fetch + callbacks
     9. Shop: filter / search / sort / cart
    10. Start-up
   ========================================================== */


/* ---------- 0. Helpers ---------- */

// localStorage can throw (private mode, blocked cookies), so wrap it.
const storage = {
    get(key, fallback = null) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : value;
        } catch (error) {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            /* ignore: the feature simply will not be remembered */
        }
    }
};

// Restart a CSS animation by toggling a class (used for pop / bump effects).
function playAnimation(element, className) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth; // force reflow so the animation can restart
    element.classList.add(className);
    element.addEventListener('animationend', () => element.classList.remove(className), { once: true });
}


/* ---------- 1. Sound effects ---------- */
/* Sounds are generated with the Web Audio API, so no audio files are needed.
   Only ONE sound can play at a time: a new sound fades out the previous one,
   and very fast repeated calls are ignored (prevents overlap / lag). */

const SoundFX = {
    context: null,
    masterGain: null,
    lastPlayed: 0,
    muted: storage.get('de-muted') === '1',

    // Each sound is a list of notes: frequency (Hz), start (s), length (s)
    presets: {
        click:   { wave: 'triangle', notes: [{ f: 520, t: 0, d: 0.07 }] },
        tick:    { wave: 'sine',     notes: [{ f: 700, t: 0, d: 0.04 }] },
        star:    { wave: 'sine',     notes: [{ f: 660, t: 0, d: 0.08 }, { f: 880, t: 0.07, d: 0.12 }] },
        add:     { wave: 'triangle', notes: [{ f: 440, t: 0, d: 0.08 }, { f: 660, t: 0.08, d: 0.14 }] },
        remove:  { wave: 'sawtooth', notes: [{ f: 300, t: 0, d: 0.08 }, { f: 200, t: 0.08, d: 0.12 }] },
        success: { wave: 'sine',     notes: [{ f: 523, t: 0, d: 0.1 }, { f: 659, t: 0.1, d: 0.1 }, { f: 784, t: 0.2, d: 0.2 }] },
        error:   { wave: 'square',   notes: [{ f: 220, t: 0, d: 0.12 }, { f: 180, t: 0.12, d: 0.18 }] },
        day:     { wave: 'sine',     notes: [{ f: 600, t: 0, d: 0.08 }, { f: 900, t: 0.08, d: 0.14 }] },
        night:   { wave: 'sine',     notes: [{ f: 500, t: 0, d: 0.08 }, { f: 330, t: 0.08, d: 0.16 }] }
    },

    play(name) {
        if (this.muted || !this.presets[name]) return;

        const now = performance.now();
        if (now - this.lastPlayed < 70) return; // ignore rapid repeats
        this.lastPlayed = now;

        try {
            // The context is created on the first user action (browser autoplay rules).
            if (!this.context) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.context = new AudioCtx();
            }
            if (this.context.state === 'suspended') this.context.resume();

            // Fade out the previous sound so two sounds never overlap.
            if (this.masterGain) {
                const old = this.masterGain;
                old.gain.cancelScheduledValues(this.context.currentTime);
                old.gain.setTargetAtTime(0, this.context.currentTime, 0.015);
            }

            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.12; // keep it quiet
            this.masterGain.connect(this.context.destination);

            const preset = this.presets[name];
            preset.notes.forEach(note => {
                const osc = this.context.createOscillator();
                const envelope = this.context.createGain();
                const start = this.context.currentTime + note.t;
                const end = start + note.d;

                osc.type = preset.wave;
                osc.frequency.value = note.f;
                envelope.gain.setValueAtTime(0.0001, start);
                envelope.gain.exponentialRampToValueAtTime(1, start + 0.01);
                envelope.gain.exponentialRampToValueAtTime(0.0001, end);

                osc.connect(envelope);
                envelope.connect(this.masterGain);
                osc.start(start);
                osc.stop(end + 0.02);
            });
        } catch (error) {
            console.warn('Sound could not be played:', error);
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        storage.set('de-muted', this.muted ? '1' : '0');
        return this.muted;
    }
};

function initSoundToggle() {
    const button = document.getElementById('sound-toggle');
    if (!button) return;

    const render = () => {
        button.innerHTML = SoundFX.muted ? '&#128263;' : '&#128266;'; // muted / speaker icon
        button.setAttribute('aria-pressed', String(!SoundFX.muted));
        button.title = SoundFX.muted ? 'Sound off (M)' : 'Sound on (M)';
    };

    button.addEventListener('click', () => {
        SoundFX.toggleMute();
        render();
        SoundFX.play('click'); // plays only if sound was just turned on
    });
    render();
}

// Play a small click for every normal button on the site.
function initButtonSounds() {
    document.addEventListener('click', event => {
        const button = event.target.closest('.btn, .btn-submit');
        // Buttons with their own sound are marked with data-sound="own".
        if (button && button.dataset.sound !== 'own') SoundFX.play('click');
    });
}


/* ---------- 2. Day / Night theme ---------- */

function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-bs-theme', theme); // Bootstrap components follow too

    const button = document.getElementById('theme-toggle');
    if (button) {
        // The button shows the theme you will switch TO.
        button.innerHTML = theme === 'dark' ? '&#9728; Day' : '&#9790; Night';
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';

    applyTheme(next);
    storage.set('de-theme', next);
    document.body.style.backgroundColor = ''; // drop the random colour from "Change BG"
    playAnimation(document.getElementById('theme-toggle'), 'spin');
    SoundFX.play(next === 'dark' ? 'night' : 'day');
}

function initTheme() {
    applyTheme(storage.get('de-theme', 'dark'));
    const button = document.getElementById('theme-toggle');
    if (button) {
        button.dataset.sound = 'own';
        button.addEventListener('click', toggleTheme);
    }
}


/* ---------- 3. Date & time, random background (Assignment 4) ---------- */

function updateDateTime() {
    const display = document.getElementById('datetime-display');
    if (!display) return;
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    display.textContent = new Date().toLocaleDateString('en-US', options);
}

function initDateTime() {
    updateDateTime();
    setInterval(updateDateTime, 60000);
}

function initBackgroundButton() {
    const button = document.getElementById('bg-color-btn');
    if (!button) return;

    button.addEventListener('click', () => {
        // padStart keeps the colour a valid 6-digit hex value
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        document.body.style.backgroundColor = randomColor;
    });
}


/* ---------- 4. Accordion, popup, form validation (Assignment 4) ---------- */

function initAccordion() {
    const headers = document.querySelectorAll('.accordion-header-custom');

    headers.forEach(header => {
        header.addEventListener('click', function () {
            const content = this.nextElementSibling;
            const isOpen = content.style.display === 'block';

            // close everything, then open the clicked one (unless it was open)
            document.querySelectorAll('.accordion-content-custom').forEach(item => item.style.display = 'none');
            headers.forEach(h => h.setAttribute('aria-expanded', 'false'));

            if (!isOpen) {
                content.style.display = 'block';
                this.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

function initSubscribePopup() {
    const modal = document.getElementById('popup-modal');
    const openButton = document.getElementById('open-popup-btn');
    const closeButton = document.querySelector('.close-btn');
    const form = document.getElementById('subscribe-form');
    const errorBox = document.getElementById('form-errors');
    if (!modal || !openButton || !closeButton) return;

    const openModal = () => { modal.style.display = 'flex'; };
    const closeModal = () => { modal.style.display = 'none'; };

    openButton.addEventListener('click', openModal);
    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.style.display === 'flex') closeModal();
    });

    if (!form) return;

    form.addEventListener('submit', event => {
        event.preventDefault();
        errorBox.innerHTML = '';

        const email = document.getElementById('sub-email').value.trim();
        const password = document.getElementById('sub-password').value;
        const confirmPassword = document.getElementById('sub-confirm').value;
        const errors = [];

        if (!email.includes('@') || email.length < 5) errors.push('\u2022 Please enter a valid email containing "@".');
        if (password.length < 6) errors.push('\u2022 Password must be at least 6 characters long.');
        if (password !== confirmPassword) errors.push('\u2022 Passwords do not match.');

        if (errors.length > 0) {
            errorBox.innerHTML = errors.join('<br>');
            SoundFX.play('error');
        } else {
            SoundFX.play('success');
            alert('Subscription successful!');
            closeModal();
            form.reset();
        }
    });
}


/* ---------- 5. Greeting by time of day (switch) ---------- */

// Turns an hour (0-23) into the name of a period of the day.
function getDayPeriod(hour) {
    switch (true) {
        case hour < 5:  return 'night';
        case hour < 12: return 'morning';
        case hour < 18: return 'afternoon';
        default:        return 'evening';
    }
}

function initGreeting() {
    const title = document.getElementById('greeting');
    const tip = document.getElementById('greeting-tip');
    const form = document.getElementById('greeting-form');
    const input = document.getElementById('visitor-name');
    if (!title || !tip || !form || !input) return;

    const period = dayPeriods[getDayPeriod(new Date().getHours())]; // object from data.js

    function showGreeting(name) {
        // textContent is safe: the typed name is never treated as HTML
        title.textContent = name ? `${period.greeting}, ${name}!` : `${period.greeting}!`;
        tip.textContent = period.tip;
        playAnimation(title, 'pop');
    }

    input.value = storage.get('de-name', '');
    showGreeting(input.value.trim());

    form.addEventListener('submit', event => {
        event.preventDefault();
        const name = input.value.trim();
        storage.set('de-name', name);
        showGreeting(name);
        SoundFX.play('success');
    });
}


/* ---------- 6. Star rating ---------- */

const ratingMessages = ['', 'Not for me', 'Fine', 'Good', 'Great', 'Love it!'];

// Saved ratings are kept as an object: { "Product title": 4, ... }
function loadRatings() {
    try {
        return JSON.parse(storage.get('de-ratings', '{}')) || {};
    } catch (error) {
        return {};
    }
}

function initRatings(root = document) {
    const savedRatings = loadRatings();

    root.querySelectorAll('.rating').forEach(container => {
        if (container.dataset.ready) return; // do not attach listeners twice
        container.dataset.ready = 'true';

        const product = container.dataset.product;
        const stars = container.querySelectorAll('.star'); // select all stars of this card
        const message = container.querySelector('.rating-message');

        // Colour the first `count` stars
        const paint = count => {
            stars.forEach(star => star.classList.toggle('selected', Number(star.dataset.value) <= count));
        };

        const setRating = value => {
            savedRatings[product] = value;
            storage.set('de-ratings', JSON.stringify(savedRatings));
            paint(value);
            message.textContent = `You rated: ${value}/5 \u2014 ${ratingMessages[value]}`;
            playAnimation(stars[value - 1], 'pop');
            SoundFX.play('star');
        };

        stars.forEach(star => {
            const value = Number(star.dataset.value);
            star.addEventListener('click', () => setRating(value));
            star.addEventListener('mouseenter', () => paint(value));   // preview
            star.addEventListener('mouseleave', () => paint(savedRatings[product] || 0));
            star.addEventListener('keydown', event => {                // keyboard: Enter / Space
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setRating(value);
                }
            });
        });

        // Restore the saved rating
        if (savedRatings[product]) {
            paint(savedRatings[product]);
            message.textContent = `You rated: ${savedRatings[product]}/5 \u2014 ${ratingMessages[savedRatings[product]]}`;
        }
    });
}


/* ---------- 7. Keyboard: menu arrows + shortcuts ---------- */

// Arrow keys move focus between menu links.
function initMenuKeyboardNav() {
    const links = Array.from(document.querySelectorAll('#mainNav .nav-link'));
    if (links.length === 0) return;

    links.forEach((link, index) => {
        link.addEventListener('keydown', event => {
            let target;

            switch (event.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    target = links[(index + 1) % links.length];
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    target = links[(index - 1 + links.length) % links.length];
                    break;
                case 'Home':
                    target = links[0];
                    break;
                case 'End':
                    target = links[links.length - 1];
                    break;
                default:
                    return; // any other key: do nothing
            }

            event.preventDefault();
            target.focus();
            SoundFX.play('tick');
        });
    });
}

// Single-key shortcuts: T = theme, M = mute, / = focus shop search.
function initShortcuts() {
    document.addEventListener('keydown', event => {
        const tag = event.target.tagName;
        const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
        if (isTyping || event.ctrlKey || event.metaKey || event.altKey) return;

        switch (event.key.toLowerCase()) {
            case 't':
                toggleTheme();
                break;
            case 'm': {
                SoundFX.toggleMute();
                const soundButton = document.getElementById('sound-toggle');
                if (soundButton) {
                    soundButton.innerHTML = SoundFX.muted ? '&#128263;' : '&#128266;';
                    soundButton.setAttribute('aria-pressed', String(!SoundFX.muted));
                }
                break;
            }
            case '/': {
                const search = document.getElementById('shop-search');
                if (search) {
                    event.preventDefault();
                    search.focus();
                }
                break;
            }
            default:
                break;
        }
    });
}


/* ---------- 8. Contact form: fetch + callbacks ---------- */

// Sends the data and calls ONE of the two callbacks when the request ends.
function sendContactForm(data, onSuccess, onError) {
    fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (!response.ok) throw new Error(`Server answered with status ${response.status}`);
            return response.json();
        })
        .then(onSuccess)
        .catch(onError);
}

function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const status = document.getElementById('contact-status');
    const submitButton = document.getElementById('contact-submit');
    const resetButton = document.getElementById('contact-reset');

    const showStatus = (text, type) => {
        status.textContent = text;
        status.className = `form-status ${type}`;
        playAnimation(status, 'pop');
    };

    // Callbacks
    const handleSuccess = result => {
        submitButton.disabled = false;
        submitButton.textContent = 'Send message';
        form.reset();
        showStatus(`Thank you! Your message was sent (ticket #${result.id}). We will reply soon.`, 'success');
        SoundFX.play('success');
    };
    const handleError = error => {
        submitButton.disabled = false;
        submitButton.textContent = 'Send message';
        showStatus(`Could not send the message: ${error.message}. Please try again.`, 'error');
        SoundFX.play('error');
    };

    form.addEventListener('submit', event => {
        event.preventDefault();

        const data = {
            name: form.elements['name'].value.trim(),
            email: form.elements['email'].value.trim(),
            message: form.elements['message'].value.trim()
        };

        // Simple validation before sending
        const fail = text => {
            showStatus(text, 'error');
            SoundFX.play('error');
        };
        if (data.name.length < 2) return fail('Please enter your name.');
        if (!data.email.includes('@') || data.email.length < 5) return fail('Please enter a valid email.');
        if (data.message.length < 5) return fail('Your message is too short.');

        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        showStatus('Sending your message...', 'info');
        sendContactForm(data, handleSuccess, handleError);
    });

    // Clear button: empty every field without reloading the page
    resetButton.addEventListener('click', () => {
        form.querySelectorAll('input, textarea').forEach(field => field.value = '');
        status.textContent = '';
        status.className = 'form-status';
    });
}


/* ---------- 9. Shop: filter / search / sort / cart ---------- */

const shopState = {
    category: 'all',
    search: '',
    maxPrice: 400,
    sortBy: 'default',
    cart: [] // items look like { id: 1, qty: 2 }
};

// switch: does the product belong to the chosen category?
function matchesCategory(product, category) {
    switch (category) {
        case 'men':    return product.category === 'Men';
        case 'women':  return product.category === 'Women';
        case 'unisex': return product.category === 'Unisex';
        case 'all':
        default:       return true;
    }
}

// switch: sorting rule. Returns a NEW sorted array.
function sortProducts(list, sortBy) {
    const copy = [...list];
    switch (sortBy) {
        case 'price-asc':  return copy.sort((a, b) => a.price - b.price);
        case 'price-desc': return copy.sort((a, b) => b.price - a.price);
        case 'name':       return copy.sort((a, b) => a.getTitle().localeCompare(b.getTitle()));
        default:           return copy;
    }
}

// Higher-order functions: filter() takes functions, then sort and render.
function getVisibleProducts() {
    const filtered = products
        .filter(product => matchesCategory(product, shopState.category))
        .filter(product => product.price <= shopState.maxPrice)
        .filter(product => shopState.search === '' || product.matchesSearch(shopState.search));
    return sortProducts(filtered, shopState.sortBy);
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    const count = document.getElementById('results-count');
    const visible = getVisibleProducts();

    if (visible.length === 0) {
        grid.innerHTML = '<p class="empty-message">No fragrances match your filters.</p>';
        count.textContent = '0 fragrances found';
        return;
    }

    // Build the cards with a loop over the array
    let html = '';
    visible.forEach(product => {
        const stars = [1, 2, 3, 4, 5]
            .map(n => `<span class="star" data-value="${n}" role="button" tabindex="0" aria-label="Rate ${n} out of 5">&#9733;</span>`)
            .join('');

        html += `
            <article class="product-card fade-in">
                <img src="${product.image}" alt="${product.getTitle()}" loading="lazy">
                <div class="card-body">
                    <span class="badge-category">${product.category}</span>
                    <h2>${product.getTitle()}</h2>
                    <p>${product.notes}</p>
                    <ul>
                        <li>${product.volume} ml</li>
                        <li class="price">${product.getFormattedPrice()}</li>
                    </ul>
                    <div class="rating" data-product="${product.getTitle()}">
                        ${stars}
                        <span class="rating-message">Rate this fragrance</span>
                    </div>
                    <button type="button" class="btn add-to-cart" data-id="${product.id}" data-sound="own">Add to cart</button>
                </div>
            </article>`;
    });

    grid.innerHTML = html;
    // stagger the entrance animation (set from JS, not inline HTML)
    grid.querySelectorAll('.product-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 60}ms`;
    });
    count.textContent = `${visible.length} fragrance${visible.length === 1 ? '' : 's'} found`;
    initRatings(grid);
}

function addToCart(productId, button) {
    const existing = shopState.cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        shopState.cart.push({ id: productId, qty: 1 });
    }
    saveCart();
    renderCart();
    SoundFX.play('add');
    playAnimation(button.closest('.product-card'), 'pulse');
    playAnimation(document.getElementById('cart-count'), 'bump');
}

function changeQuantity(productId, delta) {
    const item = shopState.cart.find(entry => entry.id === productId);
    if (!item) return;
    item.qty += delta;
    // filter keeps only items that still have quantity
    shopState.cart = shopState.cart.filter(entry => entry.qty > 0);
    saveCart();
    renderCart();
    SoundFX.play(delta > 0 ? 'add' : 'remove');
}

function saveCart() {
    storage.set('de-cart', JSON.stringify(shopState.cart));
}

function loadCart() {
    try {
        const saved = JSON.parse(storage.get('de-cart', '[]'));
        // keep only valid items (the product must still exist)
        shopState.cart = Array.isArray(saved)
            ? saved.filter(item => products.some(product => product.id === item.id) && item.qty > 0)
            : [];
    } catch (error) {
        shopState.cart = [];
    }
}

function renderCart() {
    const list = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total');
    const countElement = document.getElementById('cart-count');
    if (!list) return;

    if (shopState.cart.length === 0) {
        list.innerHTML = '<li class="empty-message">Your cart is empty.</li>';
    } else {
        // map() turns every cart item into one HTML row
        list.innerHTML = shopState.cart.map(item => {
            const product = products.find(p => p.id === item.id);
            return `
                <li class="cart-row">
                    <span class="cart-name">${product.getTitle()}</span>
                    <span class="cart-qty">
                        <button type="button" class="qty-btn" data-action="minus" data-id="${product.id}" aria-label="Decrease quantity">&minus;</button>
                        <span>${item.qty}</span>
                        <button type="button" class="qty-btn" data-action="plus" data-id="${product.id}" aria-label="Increase quantity">+</button>
                    </span>
                    <span class="cart-price">$${product.price * item.qty}</span>
                </li>`;
        }).join('');
    }

    // reduce() adds everything up
    const total = shopState.cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        return sum + product.price * item.qty;
    }, 0);
    const itemsCount = shopState.cart.reduce((sum, item) => sum + item.qty, 0);

    totalElement.textContent = `$${total}`;
    countElement.textContent = itemsCount;
}

function initShop() {
    const grid = document.getElementById('product-grid');
    if (!grid) return; // not the shop page

    const categoryBox = document.getElementById('category-buttons');
    const search = document.getElementById('shop-search');
    const priceRange = document.getElementById('price-range');
    const priceOutput = document.getElementById('price-output');
    const sortSelect = document.getElementById('shop-sort');
    const cartMessage = document.getElementById('cart-message');

    loadCart();
    renderProducts();
    renderCart();

    // Category buttons (one listener on the parent = event delegation)
    categoryBox.addEventListener('click', event => {
        const button = event.target.closest('.filter-btn');
        if (!button) return;
        categoryBox.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        shopState.category = button.dataset.category;
        renderProducts();
    });

    search.addEventListener('input', () => {
        shopState.search = search.value;
        renderProducts();
    });

    priceRange.addEventListener('input', () => {
        shopState.maxPrice = Number(priceRange.value);
        priceOutput.textContent = `$${priceRange.value}`;
        renderProducts();
    });

    sortSelect.addEventListener('change', () => {
        shopState.sortBy = sortSelect.value;
        renderProducts();
        SoundFX.play('tick');
    });

    // "Add to cart" buttons (delegation, because cards are re-created)
    grid.addEventListener('click', event => {
        const button = event.target.closest('.add-to-cart');
        if (button) addToCart(Number(button.dataset.id), button);
    });

    // + / - buttons inside the cart
    document.getElementById('cart-items').addEventListener('click', event => {
        const button = event.target.closest('.qty-btn');
        if (!button) return;
        changeQuantity(Number(button.dataset.id), button.dataset.action === 'plus' ? 1 : -1);
    });

    document.getElementById('clear-cart-btn').addEventListener('click', () => {
        shopState.cart = [];
        saveCart();
        renderCart();
        cartMessage.textContent = '';
    });

    document.getElementById('checkout-btn').dataset.sound = 'own';
    document.getElementById('checkout-btn').addEventListener('click', () => {
        if (shopState.cart.length === 0) {
            cartMessage.textContent = 'Add at least one fragrance first.';
            cartMessage.className = 'form-status error';
            SoundFX.play('error');
            return;
        }
        const total = document.getElementById('cart-total').textContent;
        cartMessage.textContent = `Thank you for your order! Total: ${total}. Our courier will call you.`;
        cartMessage.className = 'form-status success';
        playAnimation(cartMessage, 'pop');
        shopState.cart = [];
        saveCart();
        renderCart();
        SoundFX.play('success');
    });
}


/* ---------- 10. Start-up ---------- */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSoundToggle();
    initButtonSounds();
    initDateTime();
    initBackgroundButton();
    initAccordion();
    initSubscribePopup();
    initGreeting();
    initRatings();
    initMenuKeyboardNav();
    initShortcuts();
    initContactForm();
    initShop();
});
