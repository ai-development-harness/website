const button = document.querySelector('.menu-button');
const menu = document.querySelector('.mobile-nav');
const desktopBreakpoint = 940;

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

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > desktopBreakpoint) closeMenu();
});
