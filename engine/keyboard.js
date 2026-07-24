/* Keyboard control for a canvas whose whole interaction is otherwise pointer-only.
   Arrow keys nudge a 2-D probe, +/- step a scalar, Home resets. The canvas becomes
   focusable; the caller supplies role/aria in the HTML and does the actual moving
   in the callbacks. */
export function keyboardControl(el, handlers = {}) {
  el.setAttribute('tabindex', '0');
  const { nudge, step, home } = handlers;

  const onKey = e => {
    const big = e.shiftKey;
    let handled = true;
    switch (e.key) {
      case 'ArrowRight': nudge && nudge(1, 0, big); break;
      case 'ArrowLeft':  nudge && nudge(-1, 0, big); break;
      case 'ArrowUp':    nudge && nudge(0, 1, big); break;
      case 'ArrowDown':  nudge && nudge(0, -1, big); break;
      case '+': case '=': case ']': step && step(1, big); break;
      case '-': case '_': case '[': step && step(-1, big); break;
      case 'Home': home && home(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  };

  el.addEventListener('keydown', onKey);
  return { destroy() { el.removeEventListener('keydown', onKey); } };
}
