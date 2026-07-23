import { describe, it, expect, beforeEach } from 'vitest';
import { COURSES, PLAYGROUNDS, bySlug, courseOf, inCourse, next, prev, hrefFor, mountNav } from './sequencer.js';

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

describe('mountNav', () => {
  beforeEach(() => { document.body.innerHTML = '<div class="wrap"><h1>page</h1></div>'; });

  it('inserts itself as the first child of .wrap', () => {
    const nav = mountNav('gradient');
    expect(document.querySelector('.wrap').firstChild).toBe(nav);
  });

  it('shows a pill for every playground, so any page is one click away', () => {
    mountNav('gradient');
    const pills = [...document.querySelectorAll('.pgpill')];
    expect(pills).toHaveLength(PLAYGROUNDS.length);
    expect(pills.map(p => p.textContent)).toEqual(PLAYGROUNDS.map(p => p.title));
  });

  it('marks the current playground and makes it a non-link', () => {
    mountNav('vector-fields');
    const on = document.querySelectorAll('.pgpill.on');
    expect(on).toHaveLength(1);
    expect(on[0].textContent).toBe('Vector Fields');
    expect(on[0].tagName).toBe('SPAN');
    expect(on[0].getAttribute('aria-current')).toBe('page');
  });

  it('every other pill is a link to that playground', () => {
    mountNav('gradient');
    const links = [...document.querySelectorAll('a.pgpill')];
    expect(links).toHaveLength(PLAYGROUNDS.length - 1);
    links.forEach(a => expect(a.getAttribute('href')).toMatch(/^\/playgrounds\/[a-z0-9-]+\/$/));
  });

  it('uses no <select>, which would hijack the scroll wheel', () => {
    mountNav('gradient');
    expect(document.querySelectorAll('.pgnav select')).toHaveLength(0);
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
