/* Control primitives shared by every playground's wiring layer.
   These replace the hand-rolled createElement loops, `input` listeners and
   manually-computed `--fill` percentages that each content.js used to carry. */

const resolve = target => (typeof target === 'string' ? document.getElementById(target) : target);

/**
 * A row of mutually-exclusive buttons built from a data array.
 *
 * Selection state is scoped to this group's own container, so a page may hold
 * several independent groups. (The hand-written version deselected via a global
 * `document.querySelectorAll('.fbtn')`, which would have crossed the streams
 * the moment a page grew a second group.)
 *
 * @param mount     container element or its id; buttons are appended to it
 * @param items     array of `{ label, id? }` — `label` is the button text
 * @param onSelect  called as (item, index) when the selection changes
 * @param opts.className  button class (default 'fbtn'; the axis toggle uses 'tbtn')
 * @param opts.selected   index active on construction (default 0, no callback fired)
 * @param opts.reselect   fire onSelect when the active button is clicked again
 *                        (default false — otherwise a handler that awards points
 *                        turns the active button into a score farm)
 */
export function buttonGroup(mount, items, onSelect, opts = {}) {
  const el = resolve(mount);
  const className = opts.className ?? 'fbtn';
  const reselect = opts.reselect ?? false;
  let current = -1;

  const buttons = items.map((item, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = item.label;
    if (item.id != null) b.dataset.id = item.id;
    b.addEventListener('click', () => select(i));
    el.appendChild(b);
    return b;
  });

  function select(i, { notify = true } = {}) {
    const unchanged = i === current;
    buttons.forEach((b, k) => b.classList.toggle('on', k === i));
    current = i;
    if (notify && (reselect || !unchanged)) onSelect(items[i], i);
  }

  select(opts.selected ?? 0, { notify: false });

  return {
    el, buttons, select,
    get index() { return current; },
    get item() { return items[current]; },
  };
}

/**
 * A range input that keeps its own `--fill` track gradient in sync.
 *
 * The fill percentage is derived from the element's own min/max, so callers no
 * longer hand-compute it — that arithmetic was duplicated (and written two
 * different ways) across the playgrounds.
 *
 * `set()` and `range()` update the value without firing `onInput`, matching how
 * programmatic updates behaved before.
 *
 * @param target       input element or its id
 * @param opts.onInput called with the numeric value on user input
 * @param opts.min/max/step/value  applied on construction if provided
 */
export function slider(target, opts = {}) {
  const el = resolve(target);

  function paint() {
    const min = +el.min, max = +el.max;
    const pct = max > min ? ((+el.value - min) / (max - min)) * 100 : 0;
    el.style.setProperty('--fill', pct + '%');
  }

  function range({ min, max, step, value } = {}) {
    if (min !== undefined) el.min = min;
    if (max !== undefined) el.max = max;
    if (step !== undefined) el.step = step;
    if (value !== undefined) el.value = value;
    paint();
  }

  el.addEventListener('input', () => { paint(); opts.onInput && opts.onInput(+el.value); });
  range(opts);
  paint();

  return {
    el, range, paint,
    get value() { return +el.value; },
    set(v) { el.value = v; paint(); },
  };
}

/**
 * A play/pause button driving an interval.
 *
 * `onTick` returning exactly `false` stops the ticker and restores the idle
 * label — that is how an animation signals it has reached its end.
 *
 * @param target          button element or its id
 * @param opts.intervalMs tick period (default 250)
 * @param opts.playLabel  button text while idle
 * @param opts.pauseLabel button text while running
 * @param opts.onStart    called once when starting, before the first tick
 * @param opts.onTick     called each interval; return false to stop
 */
export function ticker(target, opts = {}) {
  const el = resolve(target);
  const { intervalMs = 250, playLabel = '▸ Play', pauseLabel = '⏸ Pause', onStart, onTick } = opts;
  let id = null;

  function stop() {
    if (id !== null) { clearInterval(id); id = null; }
    el.textContent = playLabel;
  }

  function start() {
    el.textContent = pauseLabel;
    if (onStart) onStart();
    id = setInterval(() => { if (onTick && onTick() === false) stop(); }, intervalMs);
  }

  el.addEventListener('click', () => (id !== null ? stop() : start()));
  el.textContent = playLabel;   // own the idle label rather than trusting the markup

  return { el, start, stop, get running() { return id !== null; } };
}
