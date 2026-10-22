const root = document.documentElement;
root.classList.add('js');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasIO = 'IntersectionObserver' in window;
const header = document.querySelector('[data-header]');
if (header && hasIO) {
const sentinel = document.createElement('div');
sentinel.className = 'scroll-sentinel';
sentinel.setAttribute('aria-hidden', 'true');
document.body.prepend(sentinel);
new IntersectionObserver(([entry]) => header.toggleAttribute('data-scrolled', !entry.isIntersecting)).observe(sentinel);
}
document.querySelectorAll('[data-disclosure]').forEach((button) => {
const panel = document.getElementById(button.getAttribute('aria-controls'));
const item = button.parentElement;
const set = (open) => { button.setAttribute('aria-expanded', String(open)); panel.hidden = !open; };
button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
item.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { set(false); button.focus(); } });
item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) set(false); });
document.addEventListener('click', (e) => { if (!item.contains(e.target)) set(false); });
});
const menu = document.getElementById('menu');
const menuButton = document.querySelector('[data-menu-open]');
const menuLink = document.querySelector('.menu-link');
if (menu && menuButton && typeof menu.showModal === 'function') {
menuButton.hidden = false;
if (menuLink) menuLink.hidden = true;
const close = () => { if (menu.open) menu.close(); };
menuButton.addEventListener('click', () => { menu.showModal(); menuButton.setAttribute('aria-expanded', 'true'); });
menu.addEventListener('close', () => { menuButton.setAttribute('aria-expanded', 'false'); menuButton.focus(); });
menu.querySelector('[data-menu-close]').addEventListener('click', close);
menu.addEventListener('click', (e) => {
const r = menu.getBoundingClientRect();
if (e.target === menu && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) close();
});
menu.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', close));
matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) close(); });
}
const isField = (el) => el instanceof Element && el.matches('input, textarea, select');
document.addEventListener('focusin', (e) => { if (isField(e.target)) root.classList.add('is-typing'); });
document.addEventListener('focusout', (e) => { if (isField(e.target)) root.classList.remove('is-typing'); });
const drawables = document.querySelectorAll('[data-draw]');
if (drawables.length && hasIO && !reduceMotion) {
root.classList.add('js-draw');
const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
if (entry.isIntersecting) { entry.target.classList.add('is-drawn'); io.unobserve(entry.target); }
}), { threshold: 0.2 });
drawables.forEach((el) => io.observe(el));
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MSG_SENDING = 'Sending…';
const MSG_SENT = 'Thank you. We have received your message.';
const MSG_FAILED = 'Sorry, your message could not be sent. Please call 02036 594031 or email info@globalcoverltd.com.';
document.querySelectorAll('[data-form]').forEach((form) => {
const summary = form.querySelector('[data-error-summary]');
const status = form.querySelector('[data-form-status]');
const submit = form.querySelector('[type="submit"]');
const submitText = submit.textContent;
const iconTemplate = form.querySelector('[data-error-icon]');
const fields = [...form.querySelectorAll('[data-error]')];
form.noValidate = true;
form.addEventListener('focusin', () => {
fetch('/global-cover-demo/forms/token.php', { headers: { Accept: 'application/json' }, cache: 'no-store' })
.then((r) => (r.ok ? r.json() : null))
.then((d) => {
if (!d) return;
form.querySelector('[data-token-time]').value = d.t;
form.querySelector('[data-token-sig]').value = d.s;
})
.catch(() => {});
}, { once: true });
const valid = (input) => {
const v = input.value.trim();
if (input.required && !v) return false;
return !(input.type === 'email' && v && !EMAIL.test(v));
};
const mark = (input, message) => {
const field = input.closest('.field');
let error = field.querySelector('.field__error');
if (!message) {
field.classList.remove('field--error');
input.removeAttribute('aria-invalid');
input.removeAttribute('aria-describedby');
if (error) error.remove();
return;
}
if (!error) {
error = document.createElement('p');
error.className = 'field__error';
error.id = `${input.id}-error`;
if (iconTemplate) error.append(iconTemplate.content.cloneNode(true));
error.append(document.createElement('span'));
input.before(error);
}
error.querySelector('span').textContent = message;
field.classList.add('field--error');
input.setAttribute('aria-invalid', 'true');
input.setAttribute('aria-describedby', error.id);
};
const showSummary = (items) => {
const list = summary.querySelector('ul');
list.replaceChildren(...items.map(([input, message]) => {
const li = document.createElement('li');
const a = document.createElement('a');
a.href = `#${input.id}`;
a.textContent = message;
a.addEventListener('click', (e) => { e.preventDefault(); input.focus(); });
li.append(a);
return li;
}));
summary.hidden = false;
summary.focus();
};
fields.forEach((input) => input.addEventListener('input', () => {
if (input.closest('.field--error') && valid(input)) mark(input, '');
}));
form.addEventListener('submit', (e) => {
const errors = fields.filter((input) => !valid(input)).map((input) => [input, input.dataset.error]);
fields.forEach((input) => mark(input, valid(input) ? '' : input.dataset.error));
if (errors.length) { e.preventDefault(); showSummary(errors); return; }
summary.hidden = true;
e.preventDefault();
submit.disabled = true;
submit.textContent = MSG_SENDING;
status.removeAttribute('data-state');
status.textContent = '';
fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
.then((r) => r.json().then((d) => ({ ok: r.ok && d.ok, d })))
.then(({ ok, d }) => {
if (ok) {
form.reset();
status.dataset.state = 'success';
status.textContent = MSG_SENT;
return;
}
const serverErrors = Object.entries((d && d.errors) || {})
.map(([name, message]) => [form.elements[name], message])
.filter(([input]) => input && input.id);
if (serverErrors.length) { serverErrors.forEach(([input, message]) => mark(input, message)); showSummary(serverErrors); return; }
throw new Error('send failed');
})
.catch(() => { status.dataset.state = 'error'; status.textContent = MSG_FAILED; })
.finally(() => { submit.disabled = false; submit.textContent = submitText; });
});
});
const banner = document.querySelector('[data-cookie-banner]');
if (banner) {
const stored = document.cookie.match(/(?:^|; )gc_consent=(accept|reject)/);
const loadAnalytics = () => {};
const save = (choice) => {
document.cookie = `gc_consent=${choice}; Max-Age=15552000; Path=/; SameSite=Lax; Secure`;
banner.hidden = true;
if (choice === 'accept') loadAnalytics();
};
if (!stored) banner.hidden = false;
else if (stored[1] === 'accept') loadAnalytics();
banner.addEventListener('click', (e) => {
const choice = e.target.closest('[data-cookie-choice]');
if (choice) save(choice.dataset.cookieChoice);
});
const settings = document.querySelector('[data-cookie-settings]');
if (settings) settings.addEventListener('click', () => { banner.hidden = false; banner.querySelector('button').focus(); });
}