const button = document.querySelector('.menu-button');
const menu = document.querySelector('.mobile-nav');

function closeMenu() {
  button?.setAttribute('aria-expanded', 'false');
  if (menu) menu.hidden = true;
}

button?.addEventListener('click', () => {
  const open = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!open));
  if (menu) menu.hidden = open;
});

menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => {
  if (window.innerWidth > 860) closeMenu();
});
