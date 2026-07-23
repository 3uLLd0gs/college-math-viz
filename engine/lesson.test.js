import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountLesson, LEVELS } from './lesson.js';

const LESSON = {
  title: 'The idea',
  intro: 'An <b>opening</b> paragraph.',
  steps: [
    { level: 'intro', title: 'First', body: 'a', state: { k: 1 } },
    { level: 'intro', title: 'Second', body: 'b' },
    { level: 'use', title: 'Third', body: 'c', state: { k: 3 }, jump: 'Try it' },
    { level: 'advanced', title: 'Fourth', body: 'd', state: { k: 4 } },
  ],
};

beforeEach(() => {
  document.body.innerHTML = '<div class="wrap"><div class="studio"><div class="graph-card"></div></div></div>';
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('mounting', () => {
  it('sits above the studio by default, so it cannot be missed', () => {
    const l = mountLesson(LESSON, { slug: 'demo' });
    expect(document.querySelector('.studio').previousElementSibling).toBe(l.el);
  });

  it('can be placed after the studio instead', () => {
    const l = mountLesson(LESSON, { slug: 'demo', place: 'after' });
    expect(document.querySelector('.studio').nextElementSibling).toBe(l.el);
  });

  it('offers a way past it once opened, since it sits in front of the playground', () => {
    const l = mountLesson(LESSON, { slug: 'demo' });
    l.el.querySelector('.lesson-toggle').click();
    document.querySelector('.lesson-skip').click();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('renders the title and intro as markup', () => {
    mountLesson(LESSON, { slug: 'demo' });
    expect(document.querySelector('.lesson h2').textContent).toBe('The idea');
    expect(document.querySelector('.lesson-intro b').textContent).toBe('opening');
  });

  it('does nothing without an anchor', () => {
    document.body.innerHTML = '<main></main>';
    expect(mountLesson(LESSON, { slug: 'demo' })).toBeNull();
  });

  it('does nothing without a lesson', () => {
    expect(mountLesson(null, { slug: 'demo' })).toBeNull();
  });
});

describe('levels', () => {
  it('offers only the levels that actually have steps', () => {
    const only = { ...LESSON, steps: [{ level: 'use', title: 'x', body: 'y' }] };
    mountLesson(only, { slug: 'demo' });
    const tabs = [...document.querySelectorAll('.lesson-levels .tbtn')];
    expect(tabs).toHaveLength(1);
    expect(tabs[0].textContent).toBe('Using it');
  });

  it('shows every present level, in teaching order, ending with the real-world one', () => {
    const all = { ...LESSON, steps: [...LESSON.steps, { level: 'real', title: 'Fifth', body: 'e' }] };
    mountLesson(all, { slug: 'demo' });
    const tabs = [...document.querySelectorAll('.lesson-levels .tbtn')];
    expect(tabs.map(t => t.textContent)).toEqual(LEVELS.map(L => L.label));
    expect(LEVELS[LEVELS.length - 1].id).toBe('real');
  });

  it('omits the real-world level when a lesson has none', () => {
    mountLesson(LESSON, { slug: 'demo' });
    const tabs = [...document.querySelectorAll('.lesson-levels .tbtn')].map(t => t.textContent);
    expect(tabs).not.toContain('Where it shows up');
  });

  it('shows only the active level’s steps', () => {
    mountLesson(LESSON, { slug: 'demo' });
    expect(document.querySelectorAll('.lesson-step')).toHaveLength(2);   // intro has two
    [...document.querySelectorAll('.lesson-levels .tbtn')][2].click();
    expect(document.querySelectorAll('.lesson-step')).toHaveLength(1);   // advanced has one
    expect(document.querySelector('.lesson-step h3').textContent).toBe('Fourth');
  });

  it('numbers the steps within the level', () => {
    mountLesson(LESSON, { slug: 'demo' });
    expect([...document.querySelectorAll('.lesson-step-n')].map(n => n.textContent)).toEqual(['1', '2']);
  });
});

describe('worked examples drive the playground', () => {
  it('hands the step state back on click', () => {
    const onJump = vi.fn();
    mountLesson(LESSON, { slug: 'demo', onJump });
    document.querySelector('.lesson-jump').click();
    expect(onJump).toHaveBeenCalledWith({ k: 1 }, expect.objectContaining({ title: 'First' }));
  });

  it('only renders a button for steps that carry a state', () => {
    mountLesson(LESSON, { slug: 'demo' });
    expect(document.querySelectorAll('.lesson-step')).toHaveLength(2);
    expect(document.querySelectorAll('.lesson-jump')).toHaveLength(1);
  });

  it('uses a custom button label when given', () => {
    mountLesson(LESSON, { slug: 'demo' });
    [...document.querySelectorAll('.lesson-levels .tbtn')][1].click();
    expect(document.querySelector('.lesson-jump').textContent).toContain('Try it');
  });

  it('scrolls the graph back into view, since the panel sits below it', () => {
    mountLesson(LESSON, { slug: 'demo', onJump: () => {} });
    document.querySelector('.lesson-jump').click();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('survives a jump with no handler wired', () => {
    mountLesson(LESSON, { slug: 'demo' });
    expect(() => document.querySelector('.lesson-jump').click()).not.toThrow();
  });
});

describe('open/closed state persists', () => {
  it('starts FOLDED on a first visit, so it never buries the playground', () => {
    const l = mountLesson(LESSON, { slug: 'demo' });
    expect(l.el.classList.contains('closed')).toBe(true);
    expect(l.el.querySelector('.lesson-toggle').textContent).toBe('Read this');
    expect(l.el.querySelector('.lesson-toggle').getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles open and remembers it for next time', () => {
    const l = mountLesson(LESSON, { slug: 'demo' });
    l.el.querySelector('.lesson-toggle').click();
    expect(l.el.classList.contains('closed')).toBe(false);
    expect(l.el.querySelector('.lesson-toggle').textContent).toBe('Hide');

    document.body.innerHTML = '<div class="wrap"><div class="studio"></div></div>';
    const again = mountLesson(LESSON, { slug: 'demo' });
    expect(again.el.classList.contains('closed')).toBe(false);
  });

  it('the whole header opens it while folded', () => {
    const l = mountLesson(LESSON, { slug: 'demo' });
    l.el.querySelector('.lesson-head h2').click();
    expect(l.el.classList.contains('closed')).toBe(false);
  });

  it('but clicking inside the open header does not fold it again', () => {
    const l = mountLesson(LESSON, { slug: 'demo' });
    l.el.querySelector('.lesson-toggle').click();          // open
    l.el.querySelector('.lesson-head h2').click();         // stray click
    expect(l.el.classList.contains('closed')).toBe(false);
  });

  it('remembers the level a student was reading', () => {
    mountLesson(LESSON, { slug: 'demo' });
    [...document.querySelectorAll('.lesson-levels .tbtn')][2].click();

    document.body.innerHTML = '<div class="wrap"><div class="studio"></div></div>';
    mountLesson(LESSON, { slug: 'demo' });
    expect(document.querySelector('.lesson-step h3').textContent).toBe('Fourth');
    expect(document.querySelector('.lesson-levels .tbtn.on').textContent).toBe('Going further');
  });

  it('keeps playgrounds independent', () => {
    mountLesson(LESSON, { slug: 'one' }).el.querySelector('.lesson-toggle').click();
    document.body.innerHTML = '<div class="wrap"><div class="studio"></div></div>';
    expect(mountLesson(LESSON, { slug: 'two' }).el.classList.contains('closed')).toBe(true);
  });

  it('falls back to folded on corrupt storage', () => {
    localStorage.setItem('cmv:lesson:demo', '{oops');
    const l = mountLesson(LESSON, { slug: 'demo' });
    expect(l.el.classList.contains('closed')).toBe(true);
  });

  it('ignores a remembered level that no longer exists', () => {
    localStorage.setItem('cmv:lesson:demo', JSON.stringify({ open: true, level: 'gone' }));
    mountLesson(LESSON, { slug: 'demo' });
    expect(document.querySelector('.lesson-levels .tbtn.on').textContent).toBe('Start here');
  });
});
