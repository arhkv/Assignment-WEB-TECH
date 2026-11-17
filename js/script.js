/* ==========================================================
   Dark Essence - main script (Assignment 4 + 5 + 6)
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
    11. jQuery features (Assignment 6)
        Task 0  setup + ready        Task 5  animated counters
        Task 1  live filter          Task 6  spinner on submit
        Task 2  autocomplete         Task 7  toast notifications
        Task 3  search highlighting  Task 8  copy to clipboard
        Task 4  scroll progress bar  Task 9  lazy loading of images
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


// 1x1 transparent GIF: lazy images start with this, the real file comes later (Task 9).
const LAZY_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';


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
        // Validation with messages next to each field (Final project 5.2)
        if (!validateForm(form, subscribeRules(), errorBox)) {
            SoundFX.play('error');
            return;
        }

        // Assignment 6 (Tasks 6 + 7): spinner on the button, then a toast instead of alert()
        simulateRequest($(form).find('.btn-submit'), 1500, () => {
            SoundFX.play('success');
            showToast('Form submitted: subscription successful!', 'success');
            closeModal();
            form.reset();
        });
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
        const name = input.value.trim().slice(0, 20); // length limit in JS, not with maxlength
        if (name && name.length < 2) {
            setStatus(tip, 'Name must be at least 2 characters.', 'error');
            input.setAttribute('aria-invalid', 'true');
            input.focus();
            return;
        }
        input.removeAttribute('aria-invalid');
        setStatus(tip, period.tip);
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
        setButtonLoading($(submitButton), false);
        form.reset();
        showStatus(`Thank you! Your message was sent (ticket #${result.id}). We will reply soon.`, 'success');
        showToast('Form submitted: your message was sent', 'success');
        SoundFX.play('success');
    };
    const handleError = error => {
        setButtonLoading($(submitButton), false);
        showStatus(`Could not send the message: ${error.message}. Please try again.`, 'error');
        showToast('Could not send the message', 'error');
        SoundFX.play('error');
    };

    form.addEventListener('submit', event => {
        event.preventDefault();

        // Validation with messages next to each field (Final project 5.2)
        if (!validateForm(form, contactRules(), status)) {
            SoundFX.play('error');
            return;
        }

        const data = {
            name: document.getElementById('contact-name').value.trim(),
            email: document.getElementById('contact-email').value.trim(),
            phone: document.getElementById('contact-phone').value.trim(),
            message: document.getElementById('contact-message').value.trim()
        };

        setButtonLoading($(submitButton), true); // spinner + "Please wait..." (Task 6)
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
    saveShopFilters(); // remember the current filter and search (Final project 5.3)

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
                <img class="lazy" src="${LAZY_PLACEHOLDER}" data-src="${product.image}" alt="${product.getTitle()}">
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
    loadVisibleImages(); // Task 9: the new cards may already be on screen
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
    showToast('Item added to cart', 'success'); // Task 7
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
    restoreShopFilters();
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
        showToast('Cart cleared', 'info');
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
        showToast('Order placed. Thank you!', 'success');
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
    initSignupForm();
    initLoginForm();
    initProfilePage();
    initExchangeRate();
});


/* ==========================================================
   11. jQuery features (Assignment 6)
   jQuery 4.0.0 is loaded in <head> of every page, BEFORE this file.
   `$` is the jQuery function, `$(selector)` finds elements.
   ========================================================== */

/* ---------- Task 0: setup ---------- */

$(document).ready(function () {
    console.log('jQuery is ready!');

    initToastContainer();   // Task 7
    initScrollProgress();   // Task 4
    initCounters();         // Task 5
    initLiveFilter();       // Task 1
    initAutocomplete();     // Task 2
    initHighlight();        // Task 3
    initDeliveryForm();     // Task 6
    initCopyButtons();      // Task 8
    initLazyLoad();         // Task 9
});


/* ---------- Task 7: toast notifications ---------- */

function initToastContainer() {
    if ($('#toast-container').length === 0) {
        $('<div id="toast-container" aria-live="polite"></div>').appendTo('body');
    }
}

// type: "success" | "error" | "info". The toast fades in, waits, fades out and is removed.
function showToast(message, type = 'success', duration = 3000) {
    initToastContainer();
    const icons = { success: '✓', error: '✕', info: 'i' };
    const $container = $('#toast-container');

    // keep at most 4 toasts on the screen
    $container.children('.toast-msg').slice(0, -3).remove();

    const $toast = $('<div class="toast-msg" role="status"></div>')
        .addClass('toast-' + type)
        .append($('<span class="toast-icon" aria-hidden="true"></span>').text(icons[type] || icons.info))
        .append($('<span class="toast-text"></span>').text(message)) // .text() is safe: no HTML injection
        .hide()
        .appendTo($container)
        .fadeIn(250);

    const timer = setTimeout(() => $toast.fadeOut(400, () => $toast.remove()), duration);
    $toast.on('click', () => {              // click = close right away
        clearTimeout(timer);
        $toast.stop(true).fadeOut(200, () => $toast.remove());
    });
}


/* ---------- Task 6: spinner on submit ---------- */

// Shows a spinner + "Please wait..." and blocks the button, or restores it.
function setButtonLoading($button, isLoading) {
    if (isLoading) {
        if ($button.hasClass('is-loading')) return;
        $button
            .data('original-html', $button.html())
            .addClass('is-loading')
            .prop('disabled', true)
            .html('<span class="btn-spinner" aria-hidden="true"></span> Please wait…');
    } else {
        $button
            .removeClass('is-loading')
            .prop('disabled', false)
            .html($button.data('original-html') || $button.html());
    }
}

// Imitates a request to the server: spinner for `delay` ms, then back to normal.
function simulateRequest($button, delay, onDone) {
    setButtonLoading($button, true);
    setTimeout(() => {
        setButtonLoading($button, false);
        if (onDone) onDone();
    }, delay);
}

// The delivery form had no JavaScript before: now it uses the spinner and a toast.
function initDeliveryForm() {
    const $form = $('#delivery-form');
    if ($form.length === 0) return;

    $form.on('submit', function (event) {
        event.preventDefault();
        // Validation with messages next to each field (Final project 5.2)
        if (!validateForm(this, deliveryRules(), document.getElementById('delivery-status'))) {
            SoundFX.play('error');
            return;
        }
        simulateRequest($form.find('.btn-submit'), 1500, () => {
            SoundFX.play('success');
            showToast('Form submitted: we will contact you soon', 'success');
            $form[0].reset();
        });
    });
}


/* ---------- Task 1: live filter ---------- */

function initLiveFilter() {
    const $input = $('#live-filter');
    if ($input.length === 0) return;

    const $rows = $('#price-table tbody tr');
    const $count = $('#filter-count');
    const $empty = $('#filter-empty');

    $input.on('keyup input', function () {
        const query = $(this).val().trim().toLowerCase();

        // .filter() keeps only the rows whose text contains the query
        const $matches = $rows.filter(function () {
            return $(this).text().toLowerCase().indexOf(query) > -1;
        });

        $rows.not($matches).hide();
        $matches.show();

        $empty.prop('hidden', $matches.length > 0);
        $count.text(query === '' ? '' : `Showing ${$matches.length} of ${$rows.length} fragrances`);
    });
}


/* ---------- Task 2: autocomplete ---------- */

function escapeHtml(text) {
    return $('<div>').text(text).html();
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function initAutocomplete() {
    const $input = $('#shop-search');
    if ($input.length === 0 || typeof products === 'undefined') return;

    // The dropdown lives right under the input
    $input.wrap('<div class="ac-wrap"></div>').attr({ role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false' });
    const $list = $('<ul class="ac-list" role="listbox"></ul>').hide().insertAfter($input);
    const titles = products.map(product => product.getTitle());
    let activeIndex = -1;

    function close() {
        $list.hide().empty();
        $input.attr('aria-expanded', 'false');
        activeIndex = -1;
    }

    function choose(text) {
        $input.val(text);
        close();
        // tell the existing shop filter (plain JS listener) that the value changed
        $input[0].dispatchEvent(new Event('input', { bubbles: true }));
    }

    function highlightActive() {
        const $items = $list.children();
        $items.removeClass('active');
        if (activeIndex >= 0) $items.eq(activeIndex).addClass('active');
    }

    function render() {
        const query = $input.val().trim().toLowerCase();
        if (query === '') return close();

        const matches = titles.filter(title => title.toLowerCase().includes(query)).slice(0, 6);
        if (matches.length === 0) return close();

        // wrap the typed part in <strong>
        const pattern = new RegExp('(' + escapeRegExp(query) + ')', 'ig');
        $list.empty();
        matches.forEach(title => {
            $('<li role="option"></li>')
                .html(escapeHtml(title).replace(pattern, '<strong>$1</strong>'))
                .data('value', title)
                .appendTo($list);
        });
        activeIndex = -1;
        $list.show();
        $input.attr('aria-expanded', 'true');
    }

    $input.on('input', render);

    $input.on('keydown', function (event) {
        const count = $list.children().length;
        if (!$list.is(':visible') || count === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                activeIndex = (activeIndex + 1) % count;
                highlightActive();
                break;
            case 'ArrowUp':
                event.preventDefault();
                activeIndex = (activeIndex - 1 + count) % count;
                highlightActive();
                break;
            case 'Enter':
                if (activeIndex >= 0) {
                    event.preventDefault();
                    choose($list.children().eq(activeIndex).data('value'));
                }
                break;
            case 'Escape':
                close();
                break;
            default:
                break;
        }
    });

    // mousedown (not click) so it runs before the input loses focus
    $list.on('mousedown', 'li', function (event) {
        event.preventDefault();
        choose($(this).data('value'));
    });
    $list.on('mousemove', 'li', function () {
        activeIndex = $(this).index();
        highlightActive();
    });

    $input.on('blur', () => setTimeout(close, 100));
}


/* ---------- Task 3: search highlighting ---------- */

// Removes every <mark>, keeping its text, and glues the split text nodes back together.
function clearHighlights($area) {
    $area.find('mark.hl').contents().unwrap();
    $area.each(function () { this.normalize(); });
}

// Wraps every found word in <mark class="hl">. Returns how many were found.
// Text nodes are split and wrapped (not .html() replaced), so event listeners survive.
function highlightWords($area, query) {
    clearHighlights($area);

    const words = query.split(/\s+/).filter(word => word.length >= 2).map(escapeRegExp);
    if (words.length === 0) return 0;

    const regex = new RegExp(words.join('|'), 'gi');
    let total = 0;

    // 1. collect text nodes (skip the search box, scripts, buttons, form fields)
    const textNodes = [];
    $area.find('*').addBack().contents().each(function () {
        if (this.nodeType !== 3 || this.nodeValue.trim() === '') return;
        if ($(this).parent().closest('.no-highlight, script, style, textarea, select, option').length) return;
        textNodes.push(this);
    });

    // 2. in each node: split around every match and wrap it (from the end, so indexes stay valid)
    textNodes.forEach(node => {
        const found = [];
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(node.nodeValue)) !== null) {
            found.push({ index: match.index, length: match[0].length });
        }
        for (let i = found.length - 1; i >= 0; i--) {
            const middle = node.splitText(found[i].index);
            middle.splitText(found[i].length);
            $(middle).wrap('<mark class="hl"></mark>');
            total++;
        }
    });

    return total;
}

function initHighlight() {
    const $input = $('#highlight-input');
    if ($input.length === 0) return;

    const $area = $('main.container');
    const $count = $('#highlight-count');

    function run(scrollToFirst) {
        const query = $input.val().trim();
        const found = highlightWords($area, query);

        // FAQ answers are hidden: open the ones that contain a match, close those opened earlier
        $('.accordion-content-custom.search-opened').not(':has(mark.hl)').removeClass('search-opened').hide();
        $('.accordion-content-custom:has(mark.hl)').each(function () {
            const $content = $(this);
            if ($content.css('display') === 'none') $content.addClass('search-opened').show();
            $content.prev('.accordion-header-custom').attr('aria-expanded', 'true');
        });

        $count.text(query.length < 2 ? '' : (found === 0 ? 'Nothing found' : `${found} match${found === 1 ? '' : 'es'} found`));

        if (scrollToFirst && found > 0) {
            // CSS "scroll-behavior: smooth" would fight with .animate(), so switch it off meanwhile
            const $page = $('html').css('scroll-behavior', 'auto');
            $('html, body').stop().animate({ scrollTop: $('mark.hl').first().offset().top - 140 }, 350, () => {
                $page.css('scroll-behavior', '');
            });
        }
    }

    $input.on('keyup input', event => run(event.key === 'Enter'));
    $('#highlight-clear').on('click', () => {
        $input.val('').trigger('focus');
        run(false);
    });
}


/* ---------- Task 4: scroll progress bar ---------- */

function initScrollProgress() {
    const $bar = $('<div id="scroll-progress" role="progressbar" aria-label="Page scroll progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="scroll-progress-fill"></div></div>')
        .prependTo('body');
    const $fill = $bar.find('.scroll-progress-fill');
    const $window = $(window);

    function update() {
        const scrollable = $(document).height() - $window.height(); // how far the page can scroll
        const percent = scrollable > 0 ? ($window.scrollTop() / scrollable) * 100 : 0;
        $fill.css('width', percent + '%');
        $bar.attr('aria-valuenow', Math.round(percent)).toggleClass('active', percent > 0.5);
    }

    $window.on('scroll resize', update);
    update();
}


/* ---------- Task 5: animated counters ---------- */

function animateCounter($counter) {
    const target = Number($counter.data('target'));
    const suffix = $counter.data('suffix') || '';

    // jQuery animates a plain object {value: 0 -> target}; step() runs on every frame
    $({ value: 0 }).animate({ value: target }, {
        duration: 2000,
        easing: 'swing',
        step: now => $counter.text(Math.floor(now).toLocaleString('en-US') + suffix),
        complete: () => $counter.text(target.toLocaleString('en-US') + suffix)
    });
}

function initCounters() {
    const $counters = $('.counter');
    if ($counters.length === 0) return;

    function check() {
        const viewBottom = $(window).scrollTop() + $(window).height();
        $counters.not('.counted').each(function () {
            const $counter = $(this);
            if ($counter.offset().top < viewBottom - 40) {   // the number is on screen
                $counter.addClass('counted');                // run only once
                animateCounter($counter);
            }
        });
    }

    $(window).on('scroll resize', check);
    check();
}


/* ---------- Task 8: copy to clipboard ---------- */

const ICON_COPY = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

// Modern API first; old execCommand as a fallback (http pages, old browsers).
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
        const $helper = $('<textarea readonly></textarea>')
            .val(text)
            .css({ position: 'fixed', top: '-1000px', opacity: 0 })
            .appendTo('body');
        $helper[0].select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
        $helper.remove();
        ok ? resolve() : reject(new Error('copy failed'));
    });
}

function initCopyButtons() {
    const $buttons = $('.copy-btn');
    if ($buttons.length === 0) return;

    $buttons.html(ICON_COPY).attr('title', 'Copy');

    // delegated click: works for every .copy-btn
    $(document).on('click', '.copy-btn', function () {
        const $button = $(this);
        const text = $button.attr('data-copy');

        copyToClipboard(text).then(() => {
            clearTimeout($button.data('reset-timer'));
            $button.addClass('copied').html(ICON_CHECK);           // icon -> check mark
            $('<span class="copy-tip" role="status">Copied to clipboard!</span>').appendTo($button);
            SoundFX.play('tick');
            showToast('Copied: ' + text, 'success', 2000);

            $button.data('reset-timer', setTimeout(() => {         // back to normal after 2 s
                $button.removeClass('copied').html(ICON_COPY);
            }, 2000));
        }).catch(() => showToast('Could not copy. Please copy it by hand.', 'error'));
    });
}


/* ---------- Task 9: lazy loading ---------- */

// An image is "near" when its top is above the bottom edge of the window (+ 150 px margin).
function loadVisibleImages() {
    const viewBottom = $(window).scrollTop() + $(window).height() + 150;

    $('img.lazy[data-src]').each(function () {
        const $img = $(this);
        if (!$img.is(':visible')) return;                  // inside a hidden block: wait

        if ($img.offset().top <= viewBottom) {
            $img.one('load', () => $img.addClass('lazy-loaded').removeClass('lazy'))
                .attr('src', $img.attr('data-src'))        // the real download starts here
                .removeAttr('data-src');
            console.log('Lazy image loaded:', $img.attr('src'));
        }
    });
}

function initLazyLoad() {
    $(window).on('scroll resize load', loadVisibleImages);
    loadVisibleImages();
}


/* ==========================================================
   12. Final project: validation, accounts, exchange rate
   ========================================================== */

// Popular passwords that pass the character rules but are easy to guess
const COMMON_PASSWORDS = [
    'password1', 'password12', 'qwerty12', 'qwerty123', 'letmein1', 'welcome1',
    'iloveyou1', 'admin123', 'abc12345', '12345678a', 'passw0rd', 'november1'
];

// Small reusable checks. Each takes the field value and returns true when it is valid.
const validators = {
    minLength: min => value => value.trim().length >= min,
    // local part without spaces/@, a domain with labels, no double dots, TLD of 2+ letters
    email: value => {
        const text = value.trim();
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/.test(text)
            && !text.includes('..') && !text.startsWith('.') && !/\.@/.test(text);
    },
    // digits only after removing spaces, brackets and dashes; optional leading +; 10-15 digits;
    // rejects numbers made of one repeated digit (e.g. 1111111111)
    phone: value => {
        const cleaned = value.trim().replace(/[\s()-]/g, '');
        return /^\+?\d{10,15}$/.test(cleaned) && !/^(\+)?(\d)\2+$/.test(cleaned);
    },
    // 8+ characters, lowercase, uppercase and a digit; no leading/trailing spaces; not a common password
    password: value => value.length >= 8
        && value === value.trim()
        && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)
        && !COMMON_PASSWORDS.includes(value.toLowerCase()),
    matches: getOther => value => value === getOther()
};

// Puts a short status text in an element and marks it as error / success.
function setStatus(element, text, type = '') {
    if (!element) return;
    element.textContent = text;
    element.classList.toggle('error', type === 'error');
    element.classList.toggle('success', type === 'success');
}

// Validates a form and shows every error next to its field (not in alert()).
// rules: [{ field: 'input-id', checks: [{ test: function, message: 'text' }] }]
// Returns true when every field passes.
function validateForm(form, rules, statusElement) {
    form.querySelectorAll('.field-error').forEach(node => node.remove());
    form.querySelectorAll('[aria-invalid]').forEach(field => {
        field.removeAttribute('aria-invalid');
        field.classList.remove('is-invalid');
    });

    let firstInvalid = null;
    rules.forEach(rule => {
        const field = document.getElementById(rule.field);
        if (!field) return;
        const failed = rule.checks.find(check => !check.test(field.value));
        if (!failed) return;

        const message = document.createElement('small');
        message.className = 'field-error';
        message.setAttribute('role', 'alert');
        message.textContent = failed.message;
        (field.closest('.form-group') || field.parentElement).appendChild(message);

        field.setAttribute('aria-invalid', 'true');
        field.classList.add('is-invalid');
        firstInvalid = firstInvalid || field;
    });

    if (firstInvalid) {
        setStatus(statusElement, 'Please fix the highlighted fields.', 'error');
        firstInvalid.focus();
        return false;
    }
    setStatus(statusElement, '');
    return true;
}

// Rules for every form on the site
function subscribeRules() {
    return [
        { field: 'sub-email', checks: [{ test: validators.email, message: 'Enter a valid email, e.g. name@mail.com.' }] }
    ];
}

function contactRules() {
    return [
        { field: 'contact-name', checks: [{ test: validators.minLength(2), message: 'Please enter your name (at least 2 characters).' }] },
        { field: 'contact-email', checks: [{ test: validators.email, message: 'Enter a valid email, e.g. name@mail.com.' }] },
        { field: 'contact-phone', checks: [{ test: validators.phone, message: 'Enter 10–15 digits, e.g. +7 700 000 00 00.' }] },
        { field: 'contact-message', checks: [{ test: validators.minLength(5), message: 'Your message is too short (at least 5 characters).' }] }
    ];
}

function deliveryRules() {
    return [
        { field: 'fullname', checks: [{ test: validators.minLength(2), message: 'Enter your name (at least 2 characters).' }] },
        { field: 'email', checks: [{ test: validators.email, message: 'Enter a valid email, e.g. name@mail.com.' }] },
        { field: 'phone', checks: [{ test: validators.phone, message: 'Enter 10–15 digits, e.g. +7 700 000 00 00.' }] },
        { field: 'message', checks: [{ test: validators.minLength(10), message: 'Enter the delivery address (at least 10 characters).' }] }
    ];
}

function signupRules() {
    return [
        { field: 'signup-name', checks: [{ test: validators.minLength(2), message: 'Name must be at least 2 characters.' }] },
        { field: 'signup-email', checks: [{ test: validators.email, message: 'Enter a valid email, e.g. name@mail.com.' }] },
        { field: 'signup-phone', checks: [{ test: validators.phone, message: 'Enter 10–15 digits, e.g. +7 700 000 00 00.' }] },
        { field: 'signup-password', checks: [{ test: validators.password, message: 'Use 8+ characters with an uppercase letter, a lowercase letter and a digit.' }] },
        { field: 'signup-confirm', checks: [{ test: validators.matches(() => document.getElementById('signup-password').value), message: 'Passwords do not match.' }] }
    ];
}

function loginRules() {
    return [
        { field: 'login-email', checks: [{ test: validators.email, message: 'Enter a valid email, e.g. name@mail.com.' }] },
        { field: 'login-password', checks: [{ test: value => value.length > 0, message: 'Enter your password.' }] }
    ];
}


/* ---------- Accounts: sign up, log in, profile (localStorage simulation) ---------- */

const USERS_KEY = 'de-users';
const SESSION_KEY = 'de-session';

function getUsers() {
    try {
        const users = JSON.parse(storage.get(USERS_KEY, '[]'));
        return Array.isArray(users) ? users : [];
    } catch (error) {
        return [];
    }
}

function saveUsers(users) {
    storage.set(USERS_KEY, JSON.stringify(users));
}

// The logged-in user is found by the email saved in the session key.
function getCurrentUser() {
    const email = storage.get(SESSION_KEY, '');
    return email ? getUsers().find(user => user.email === email) || null : null;
}

// SHA-256 hash, so passwords are not kept as plain text in localStorage.
// (This is still a classroom simulation, not real backend security.)
async function hashPassword(password) {
    if (!window.crypto || !crypto.subtle) {
        throw new Error('secure hashing is not available in this browser');
    }
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function initSignupForm() {
    const form = document.getElementById('signup-form');
    if (!form) return;
    const status = document.getElementById('signup-status');

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!validateForm(form, signupRules(), status)) {
            SoundFX.play('error');
            return;
        }

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim().toLowerCase();
        const phone = document.getElementById('signup-phone').value.trim();
        const password = document.getElementById('signup-password').value;

        const users = getUsers();
        if (users.some(user => user.email === email)) {
            setStatus(status, 'An account with this email already exists. Try logging in.', 'error');
            SoundFX.play('error');
            return;
        }

        try {
            const passwordHash = await hashPassword(password);
            users.push({ name, email, phone, passwordHash, createdAt: new Date().toISOString() });
            saveUsers(users);
        } catch (error) {
            setStatus(status, `Could not create the account: ${error.message}.`, 'error');
            return;
        }

        SoundFX.play('success');
        showToast('Account created. Please log in.', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 900);
    });
}

function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    const status = document.getElementById('login-status');

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!validateForm(form, loginRules(), status)) {
            SoundFX.play('error');
            return;
        }

        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;
        const user = getUsers().find(entry => entry.email === email);

        let passwordMatches = false;
        if (user) {
            try {
                passwordMatches = (await hashPassword(password)) === user.passwordHash;
            } catch (error) {
                setStatus(status, `Could not check the password: ${error.message}.`, 'error');
                return;
            }
        }

        // Same message for "no such email" and "wrong password", so it does not reveal which one is wrong.
        if (!passwordMatches) {
            setStatus(status, 'Wrong email or password.', 'error');
            SoundFX.play('error');
            return;
        }

        storage.set(SESSION_KEY, user.email);
        SoundFX.play('success');
        showToast(`Welcome back, ${user.name}!`, 'success');
        setTimeout(() => { window.location.href = 'profile.html'; }, 700);
    });
}

function initProfilePage() {
    const details = document.getElementById('profile-details');
    if (!details) return;

    const guest = document.getElementById('profile-guest');
    const actions = document.getElementById('profile-actions');
    const user = getCurrentUser();

    if (!user) {
        guest.hidden = false;
        return;
    }

    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-phone').textContent = user.phone;
    document.getElementById('profile-since').textContent = new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    details.hidden = false;
    actions.hidden = false;

    document.getElementById('logout-btn').addEventListener('click', () => {
        storage.set(SESSION_KEY, '');
        showToast('You are logged out', 'info');
        setTimeout(() => { window.location.href = 'login.html'; }, 600);
    });
}


/* ---------- External API: USD -> KZT rate on the pricing page ---------- */

const RATE_CACHE_KEY = 'de-usd-kzt';

// Accepts "210", "210.5" or "210,5" and returns a positive number, otherwise null.
function parseAmount(text) {
    const cleaned = text.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
    const amount = Number(cleaned);
    return amount > 0 ? amount : null;
}

async function fetchUsdToKzt() {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error(`server answered with status ${response.status}`);
    const data = await response.json();
    const rate = data && data.rates ? Number(data.rates.KZT) : NaN;
    if (!rate) throw new Error('the KZT rate is missing in the response');
    return rate;
}

function initExchangeRate() {
    const status = document.getElementById('rate-status');
    const amountInput = document.getElementById('usd-amount');
    const result = document.getElementById('kzt-result');
    const amountError = document.getElementById('converter-error');
    if (!status || !amountInput || !result) return;

    let rate = null;

    const updateResult = () => {
        const amount = parseAmount(amountInput.value);
        amountError.hidden = amount !== null;
        amountError.textContent = 'Enter a positive amount, e.g. 210.';
        result.textContent = (amount === null || rate === null)
            ? '—'
            : Math.round(amount * rate).toLocaleString('en-US');
    };

    const showCached = reason => {
        try {
            const cached = JSON.parse(storage.get(RATE_CACHE_KEY, 'null'));
            if (cached && cached.rate) {
                rate = cached.rate;
                const date = new Date(cached.savedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                setStatus(status, `${reason} Showing the rate saved on ${date}: 1 USD = ${rate.toFixed(2)} KZT.`, 'error');
                return true;
            }
        } catch (error) { /* no usable cache */ }
        return false;
    };

    fetchUsdToKzt()
        .then(liveRate => {
            rate = liveRate;
            storage.set(RATE_CACHE_KEY, JSON.stringify({ rate, savedAt: new Date().toISOString() }));
            setStatus(status, `Live rate: 1 USD = ${rate.toFixed(2)} KZT.`, 'success');
        })
        .catch(error => {
            if (!showCached(`Could not load the live rate (${error.message}).`)) {
                setStatus(status, `Could not load the exchange rate (${error.message}). Please try again later.`, 'error');
            }
        })
        .finally(updateResult);

    amountInput.addEventListener('input', updateResult);
}


/* ---------- Shop filters saved in localStorage (Final project 5.3) ---------- */

function saveShopFilters() {
    storage.set('de-shop-filters', JSON.stringify({
        category: shopState.category,
        search: shopState.search,
        maxPrice: shopState.maxPrice,
        sortBy: shopState.sortBy
    }));
}

// Reads the saved filters, checks them, and puts them back into the controls.
function restoreShopFilters() {
    let saved = null;
    try {
        saved = JSON.parse(storage.get('de-shop-filters', 'null'));
    } catch (error) {
        saved = null;
    }
    if (!saved || typeof saved !== 'object') return;

    shopState.category = ['all', 'men', 'women', 'unisex'].includes(saved.category) ? saved.category : 'all';
    shopState.search = typeof saved.search === 'string' ? saved.search : '';
    shopState.maxPrice = Number.isFinite(saved.maxPrice) ? Math.min(Math.max(saved.maxPrice, 100), 400) : 400;
    shopState.sortBy = ['default', 'price-asc', 'price-desc', 'name'].includes(saved.sortBy) ? saved.sortBy : 'default';

    document.querySelectorAll('#category-buttons .filter-btn')
        .forEach(button => button.classList.toggle('active', button.dataset.category === shopState.category));
    document.getElementById('shop-search').value = shopState.search;
    document.getElementById('price-range').value = shopState.maxPrice;
    document.getElementById('price-output').textContent = `$${shopState.maxPrice}`;
    document.getElementById('shop-sort').value = shopState.sortBy;
}
