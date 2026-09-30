const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const loader = $("#loader");
const seenKey = "dorevielle-last-visit";
const lastVisit = Number(localStorage.getItem(seenKey) || 0);
const oneHour = 60 * 60 * 1000;

if (Date.now() - lastVisit < oneHour) {
  loader.classList.add("is-hidden");
} else {
  window.addEventListener("load", () => {
    setTimeout(() => loader.classList.add("is-hidden"), 1150);
  });
}
localStorage.setItem(seenKey, Date.now().toString());

const scrollButtons = $$("[data-scroll-to]");
scrollButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.scrollTo === "chat-panel") {
      openPanel(chatPanel);
      mobileNav?.classList.remove("open");
      return;
    }
    const target = document.getElementById(button.dataset.scrollTo);
    if (target) target.scrollIntoView({ behavior: "smooth" });
    $("#mobile-nav")?.classList.remove("open");
  });
});

const mobileMenu = $(".mobile-menu");
const mobileNav = $("#mobile-nav");
mobileMenu?.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("open");
  mobileMenu.setAttribute("aria-expanded", String(isOpen));
});

const filters = $$(".category-tab");
const cards = $$(".product-card");
filters.forEach((tab) => {
  tab.addEventListener("click", () => {
    filters.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    const filter = tab.dataset.filter;
    cards.forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
  });
});

$("#view-all").addEventListener("click", () => {
  filters.forEach((item) => item.classList.toggle("active", item.dataset.filter === "all"));
  cards.forEach((card) => { card.hidden = false; });
  $("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
});

let cart = [];
const cartDrawer = $("#cart-drawer");
const chatPanel = $("#chat-panel");
const overlay = $("#overlay");

function openPanel(panel) {
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closePanels() {
  [cartDrawer, chatPanel].forEach((panel) => {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  });
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}

$("#bag-button").addEventListener("click", () => openPanel(cartDrawer));
$("#cart-close").addEventListener("click", closePanels);
$("#chat-launcher").addEventListener("click", () => openPanel(chatPanel));
$("#chat-close").addEventListener("click", closePanels);
$$('a[href="#chat-panel"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openPanel(chatPanel);
  });
});
overlay.addEventListener("click", closePanels);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePanels();
});

function addToCart(name, price) {
  const existing = cart.find((item) => item.name === name);
  if (existing) existing.quantity += 1;
  else cart.push({ name, price: Number(price), quantity: 1 });
  renderCart();
  openPanel(cartDrawer);
}

$$("[data-product]").forEach((button) => {
  button.addEventListener("click", () => addToCart(button.dataset.product, button.dataset.price));
});

function renderCart() {
  const quantity = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  $("#bag-count").textContent = quantity;
  $("#drawer-count").textContent = `(${quantity})`;
  const items = $("#cart-items");
  if (!cart.length) {
    items.innerHTML = `<div class="empty-cart"><span>˚</span><p>Your bag is waiting<br />for a good idea.</p><button data-scroll-to="shop">browse the edit ↗</button></div>`;
    items.querySelector("[data-scroll-to]").addEventListener("click", () => {
      closePanels();
      $("#shop").scrollIntoView({ behavior: "smooth" });
    });
    $("#cart-footer").hidden = true;
    return;
  }
  items.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-item-art">${index % 2 ? "✦" : "D˚"}</div>
      <div><h3>${item.name}</h3><p>$${item.price} · quantity ${item.quantity}</p></div>
      <button class="remove-item" data-remove="${item.name}" type="button">remove</button>
    </div>`).join("");
  $$(".remove-item", items).forEach((button) => {
    button.addEventListener("click", () => {
      cart = cart.filter((item) => item.name !== button.dataset.remove);
      renderCart();
    });
  });
  $("#cart-total").textContent = `$${total.toFixed(2)}`;
  $("#cart-footer").hidden = false;
}

$("#checkout-button").addEventListener("click", () => {
  $("#checkout-button").innerHTML = "shopify checkout connection coming soon <span>✦</span>";
  $("#checkout-button").disabled = true;
});

const chatBody = $("#chat-body");
const chatInput = $("#chat-input");
const chatForm = $("#chat-form");
const suggestedReplies = [
  "I’d start with the Soft Launch Guidebook — it’s made for turning a fuzzy idea into a small, shippable next step.",
  "For a new developer, the Soft Girl Dark Mode theme + a Make Room Desk Mat is a very good little starter kit.",
  "You are not behind. Pick one tab, give it 20 minutes, and make the smallest version real."
];
function addChatBubble(message, type) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = message;
  chatBody.appendChild(bubble);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function answerChat(message) {
  const lower = message.toLowerCase();
  let reply = suggestedReplies[2];
  if (lower.includes("gift") || lower.includes("present")) reply = suggestedReplies[1];
  if (lower.includes("developer") || lower.includes("code") || lower.includes("theme")) reply = suggestedReplies[1];
  if (lower.includes("guide") || lower.includes("plan") || lower.includes("idea")) reply = suggestedReplies[0];
  setTimeout(() => addChatBubble(reply, "assistant"), 450);
}
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  addChatBubble(message, "user");
  chatInput.value = "";
  answerChat(message);
});
$$(".chat-suggestions button").forEach((button) => {
  button.addEventListener("click", () => {
    addChatBubble(button.dataset.message, "user");
    answerChat(button.dataset.message);
  });
});

$("#newsletter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = $("#email").value;
  $("#form-message").textContent = `you’re on the list, ${email.split("@")[0]} ✦`;
  event.target.reset();
});