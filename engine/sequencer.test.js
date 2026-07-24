import { describe, it, expect, beforeEach } from 'vitest';
import { COURSES, PLAYGROUNDS, bySlug, courseOf, inCourse, next, prev, hrefFor, mountNav, neighbours } from './sequencer.js';

describe('the catalogue is internally consistent', () => {
  it('every slug is unique', () => {
    const slugs = PLAYGROUNDS.map(p => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every playground belongs to a declared course', () => {
    const ids = new Set(COURSES.map(c => c.id));
    PLAYGROUNDS.forEach(p => expect(ids.has(p.course)).toBe(true));
  });

  it('every playground has a title, tag and blurb', () => {
    PLAYGROUNDS.forEach(p => {
      expect(p.title.length).toBeGreaterThan(3);
      expect(p.tag.length).toBeGreaterThan(5);
      expect(p.blurb.length).toBeGreaterThan(40);
    });
  });

  it('slugs are URL-safe', () => {
    PLAYGROUNDS.forEach(p => expect(p.slug).toMatch(/^[a-z0-9-]+$/));
  });

  it('groups by course without losing or duplicating anyone', () => {
    const grouped = COURSES.flatMap(c => inCourse(c.id));
    expect(grouped).toHaveLength(PLAYGROUNDS.length);
    expect(new Set(grouped.map(p => p.slug)).size).toBe(PLAYGROUNDS.length);
  });
});

describe('lookups', () => {
  it('bySlug finds a playground and returns null for a stranger', () => {
    expect(bySlug('taylor-series').title).toBe('Taylor Series');
    expect(bySlug('nope')).toBeNull();
  });

  it('courseOf reports the course label', () => {
    expect(courseOf('riemann-sums').label).toBe('Calculus 1');
    expect(courseOf('greens-theorem').label).toBe('Calculus 3');
    expect(courseOf('nope')).toBeNull();
  });

  it('hrefFor builds a root-absolute path', () => {
    expect(hrefFor('gradient')).toBe('/playgrounds/gradient/');
  });
});

describe('sequence walking', () => {
  it('prev is null at the start and next is null at the end', () => {
    expect(prev(PLAYGROUNDS[0].slug)).toBeNull();
    expect(next(PLAYGROUNDS[PLAYGROUNDS.length - 1].slug)).toBeNull();
  });

  it('next and prev are inverses in the middle', () => {
    for (let i = 1; i < PLAYGROUNDS.length - 1; i++) {
      const slug = PLAYGROUNDS[i].slug;
      expect(next(prev(slug).slug).slug).toBe(slug);
      expect(prev(next(slug).slug).slug).toBe(slug);
    }
  });

  it('walking next from the first reaches every playground exactly once', () => {
    const seen = [];
    let cur = PLAYGROUNDS[0];
    while (cur) { seen.push(cur.slug); cur = next(cur.slug); }
    expect(seen).toEqual(PLAYGROUNDS.map(p => p.slug));
  });

  it('returns null for an unknown slug rather than wrapping to an end', () => {
    expect(next('nope')).toBeNull();
    expect(prev('nope')).toBeNull();
  });
});

describe('neighbours', () => {
  it('returns the declared prereq and the sequence next', () => {
    const n = neighbours('gradient');
    expect(n.prereq?.slug).toBe('partial-derivatives');
    expect(n.next?.slug).toBe(next('gradient').slug);
  });
  it('nulls where none exist', () => {
    const n = neighbours(PLAYGROUNDS[0].slug);
    expect(n.prereq).toBeNull();
  });
});

describe('mountNav', () => {
  beforeEach(() => { document.body.innerHTML = '<div class="wrap"><h1>page</h1></div>'; });

  it('inserts itself as the first child of .wrap', () => {
    const { nav } = mountNav('gradient');
    expect(document.querySelector('.wrap').firstChild).toBe(nav);
  });

  it('renders one menu per course that has playgrounds', () => {
    mountNav('gradient');
    const btns = [...document.querySelectorAll('.pgmenu-btn')];
    const withRows = COURSES.filter(c => inCourse(c.id).length);
    expect(btns.map(b => b.textContent.replace('▾', '').trim())).toEqual(withRows.map(c => c.label));
  });

  it('lists every playground across the menus, none lost or duplicated', () => {
    mountNav('gradient');
    const items = [...document.querySelectorAll('.pgmenu-item')].map(i => i.textContent);
    expect(items).toHaveLength(PLAYGROUNDS.length);
    expect(new Set(items).size).toBe(PLAYGROUNDS.length);
  });

  it('puts each playground under its own course', () => {
    mountNav('gradient');
    COURSES.forEach(c => {
      const menu = document.querySelector(`.pgmenu[data-course="${c.id}"]`);
      if (!inCourse(c.id).length) { expect(menu).toBeNull(); return; }
      const titles = [...menu.querySelectorAll('.pgmenu-item')].map(i => i.textContent);
      expect(titles).toEqual(inCourse(c.id).map(p => p.title));
    });
  });

  it('marks the current playground and its course', () => {
    mountNav('vector-fields');
    const on = document.querySelectorAll('.pgmenu-item.on');
    expect(on).toHaveLength(1);
    expect(on[0].textContent).toBe('Vector Fields');
    expect(on[0].tagName).toBe('SPAN');
    expect(document.querySelector('.pgmenu.current').dataset.course).toBe(bySlug('vector-fields').course);
  });

  it('every other item is a link', () => {
    mountNav('gradient');
    const links = [...document.querySelectorAll('a.pgmenu-item')];
    expect(links).toHaveLength(PLAYGROUNDS.length - 1);
    links.forEach(a => expect(a.getAttribute('href')).toMatch(/^\/playgrounds\/[a-z0-9-]+\/$/));
  });

  it('uses no <select>, which would hijack the scroll wheel', () => {
    mountNav('gradient');
    expect(document.querySelectorAll('.pgnav select')).toHaveLength(0);
  });

  it('menus start closed', () => {
    mountNav('gradient');
    document.querySelectorAll('.pgmenu-list').forEach(l => expect(l.hidden).toBe(true));
    document.querySelectorAll('.pgmenu-btn').forEach(b => expect(b.getAttribute('aria-expanded')).toBe('false'));
  });

  it('a button opens its own menu', () => {
    mountNav('gradient');
    const m = document.querySelector('.pgmenu');
    m.querySelector('.pgmenu-btn').click();
    expect(m.querySelector('.pgmenu-list').hidden).toBe(false);
    expect(m.querySelector('.pgmenu-btn').getAttribute('aria-expanded')).toBe('true');
  });

  it('opening one closes the others', () => {
    mountNav('gradient');
    const [a, b] = [...document.querySelectorAll('.pgmenu')];
    a.querySelector('.pgmenu-btn').click();
    b.querySelector('.pgmenu-btn').click();
    expect(a.querySelector('.pgmenu-list').hidden).toBe(true);
    expect(b.querySelector('.pgmenu-list').hidden).toBe(false);
  });

  it('a second press on the same button closes it', () => {
    mountNav('gradient');
    const m = document.querySelector('.pgmenu');
    m.querySelector('.pgmenu-btn').click();
    m.querySelector('.pgmenu-btn').click();
    expect(m.querySelector('.pgmenu-list').hidden).toBe(true);
  });

  it('a click anywhere else closes it, so it cannot hang over a canvas', () => {
    mountNav('gradient');
    const m = document.querySelector('.pgmenu');
    m.querySelector('.pgmenu-btn').click();
    document.body.click();
    expect(m.querySelector('.pgmenu-list').hidden).toBe(true);
  });

  it('Escape closes it', () => {
    mountNav('gradient');
    const m = document.querySelector('.pgmenu');
    m.querySelector('.pgmenu-btn').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(m.querySelector('.pgmenu-list').hidden).toBe(true);
  });

  it('links back to the index', () => {
    mountNav('taylor-series');
    expect(document.querySelector('.pgnav-home').getAttribute('href')).toBe('/');
  });

  it('offers a Next link pointing at the following playground', () => {
    mountNav('gradient');
    expect(document.querySelector('.pgnav-next').getAttribute('href')).toBe(hrefFor(next('gradient').slug));
  });

  it('shows an end marker instead of a Next link on the last playground', () => {
    mountNav(PLAYGROUNDS[PLAYGROUNDS.length - 1].slug);
    const nx = document.querySelector('.pgnav-next');
    expect(nx.tagName).toBe('SPAN');
    expect(nx.getAttribute('href')).toBeNull();
  });

  it('does nothing gracefully when there is no .wrap', () => {
    document.body.innerHTML = '<main></main>';
    expect(mountNav('gradient')).toBeNull();
  });
});
