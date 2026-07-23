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
  it('inserts itself directly after the studio', () => {
    const l = mountLesson(LESSON, { slug: 'demo' });
    expect(document.querySelector('.studio').nextElementSibling).toBe(l.el);
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

  it('shows all three when all three are present, in teaching order', () => {
    mountLesson(LESSON, { slug: 'demo' });
    const tabs = [...document.querySelectorAll('.lesson-levels .tbtn')];
    expect(tabs.map(t => t.textContent)).toEqual(LEVELS.map(L => L.label));
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
  it('starts open on a first visit', () => {
    const l = mountLesson(LESSON, { slug: 'demo' });
    expect(l.el.classList.contains('closed')).toBe(false);
    expect(l.el.querySelector('.lesson-toggle').textContent).toBe('Hide');
  });

  it('toggles and remembers being closed', () => {
    const l = mountLesson(LESSON, { slug: 'demo' });
    l.el.querySelector('.lesson-toggle').click();
    expect(l.el.classList.contains('closed')).toBe(true);

    document.body.innerHTML = '<div class="wrap"><div class="studio"></div></div>';
    const again = mountLesson(LESSON, { slug: 'demo' });
    expect(again.el.classList.contains('closed')).toBe(true);
    expect(again.el.querySelector('.lesson-toggle').textContent).toBe('Show');
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
    expect(mountLesson(LESSON, { slug: 'two' }).el.classList.contains('closed')).toBe(false);
  });

  it('falls back to sane defaults on corrupt storage', () => {
    localStorage.setItem('cmv:lesson:demo', '{oops');
    const l = mountLesson(LESSON, { slug: 'demo' });
    expect(l.el.classList.contains('closed')).toBe(false);
  });

  it('ignores a remembered level that no longer exists', () => {
    localStorage.setItem('cmv:lesson:demo', JSON.stringify({ open: true, level: 'gone' }));
    mountLesson(LESSON, { slug: 'demo' });
    expect(document.querySelector('.lesson-levels .tbtn.on').textContent).toBe('Start here');
  });
});
