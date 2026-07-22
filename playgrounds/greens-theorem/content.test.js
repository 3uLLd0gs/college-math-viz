import { describe, it, expect } from 'vitest';
import { FIELDS, exactCirculation, LINEAR_CURL, curlGrid } from './content.js';
import { circulation, curlFlux, curlAt } from '../../engine/vector-field.js';

const field = id => FIELDS.find(f => f.id === id);
const loops = [[0.6, -0.4, 0.8], [-1.1, 0.7, 1.1], [0.3, 1.2, 0.45]];

describe('declared curl matches the field it comes from', () => {
  FIELDS.forEach(fd => {
    [[0.5, -0.8], [1.4, 1.1], [-1.2, 0.3]].forEach(([x, y]) => {
      it(`${fd.id}: curl at (${x}, ${y})`, () => {
        expect(curlAt(fd, x, y)).toBeCloseTo(fd.curl(x, y), 5);
      });
    });
  });
});

describe("Green's theorem: the two sides agree for every field and loop", () => {
  FIELDS.forEach(fd => {
    loops.forEach(([cx, cy, r]) => {
      it(`${fd.id}: ∮F·dr = ∬curl dA at (${cx}, ${cy}) r=${r}`, () => {
        expect(circulation(fd, cx, cy, r)).toBeCloseTo(curlFlux(fd, cx, cy, r), 4);
      });
    });
  });
});

describe('both integrators agree with the closed form where one exists', () => {
  FIELDS.filter(fd => LINEAR_CURL.has(fd.id)).forEach(fd => {
    loops.forEach(([cx, cy, r]) => {
      it(`${fd.id}: closed form at (${cx}, ${cy}) r=${r}`, () => {
        const exact = exactCirculation(fd, cx, cy, r);
        expect(circulation(fd, cx, cy, r)).toBeCloseTo(exact, 4);
        expect(curlFlux(fd, cx, cy, r)).toBeCloseTo(exact, 4);
      });
    });
  });

  it('returns null where no closed form is offered', () => {
    expect(exactCirculation(field('wave'), 0, 0, 1)).toBeNull();
  });
});

describe('the challenge is winnable: circulation really can be cancelled', () => {
  // Each solvable field has a locus where the interior curl cancels. Landing on
  // it must drive the circulation to zero for a loop of usable size.
  const cancels = [
    ['quad', 0, 0.9],       // the y-axis: cx = 0
    ['quad', 0, -1.2],
    ['hyper', 0.5, 0.5],    // the diagonal: cx = cy
    ['hyper', -0.9, -0.9],
    ['wave', 0.8, 0.8],     // a diagonal
    ['wave', 1.1, -1.1],
    ['mixed', 0.7, -1],     // the line y = -1
    ['mixed', -1.3, -1],
  ];

  cancels.forEach(([id, cx, cy]) => {
    it(`${id}: circulation vanishes at (${cx}, ${cy})`, () => {
      expect(Math.abs(circulation(field(id), cx, cy, 0.7))).toBeLessThan(1e-6);
    });
  });

  it('and does NOT vanish just off that locus', () => {
    expect(Math.abs(circulation(field('quad'), 0.6, 0, 0.7))).toBeGreaterThan(0.5);
    expect(Math.abs(circulation(field('mixed'), 0, 0.4, 0.7))).toBeGreaterThan(0.5);
  });
});

describe('every solvable field has curl of both signs', () => {
  // Otherwise nothing can cancel and the challenge is unreachable.
  FIELDS.filter(fd => fd.zeroLine).forEach(fd => {
    it(`${fd.id}: curl takes both a positive and a negative value`, () => {
      let pos = false, neg = false;
      for (let x = -2; x <= 2; x += 0.25) {
        for (let y = -2; y <= 2; y += 0.25) {
          if (fd.curl(x, y) > 0.1) pos = true;
          if (fd.curl(x, y) < -0.1) neg = true;
        }
      }
      expect(pos && neg).toBe(true);
    });
  });

  it('the gradient field is the deliberate exception, with curl identically zero', () => {
    const fd = field('grad');
    expect(fd.zeroLine).toBeNull();
    for (let x = -2; x <= 2; x += 0.5) {
      for (let y = -2; y <= 2; y += 0.5) expect(fd.curl(x, y)).toBe(0);
    }
    expect(circulation(fd, 0.4, -0.7, 1.2)).toBeCloseTo(0, 9);
  });
});

describe('curlGrid', () => {
  it('has the requested shape and spans the domain', () => {
    const z = curlGrid(field('quad'), 2, 8);
    expect(z).toHaveLength(9);
    expect(z[0]).toHaveLength(9);
    expect(z[0][0]).toBeCloseTo(-4, 12);   // curl = 2x at x = -2
    expect(z[8][0]).toBeCloseTo(4, 12);    // at x = +2
  });

  it('is flat for the gradient field', () => {
    expect(curlGrid(field('grad'), 2, 4).flat().every(v => v === 0)).toBe(true);
  });
});
