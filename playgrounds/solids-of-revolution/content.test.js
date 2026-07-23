import { describe, it, expect } from 'vitest';
import { REGIONS, AXES, methodReason, isExactAtAnyN } from './content.js';
import { diskSum, shellSum, volumeSum, methodFor } from '../../engine/revolve-3d.js';

const region = id => REGIONS.find(r => r.id === id);

describe('every declared exact volume is the real one', () => {
  REGIONS.forEach(r => {
    it(`${r.id}: about x matches a fine disk/washer sum`, () => {
      expect(diskSum(r, 40000)).toBeCloseTo(r.exact.x, 3);
    });
    it(`${r.id}: about y matches a fine shell sum`, () => {
      expect(shellSum(r, 40000)).toBeCloseTo(r.exact.y, 3);
    });
  });
});

describe('the registry covers all three methods', () => {
  const methods = new Set(REGIONS.flatMap(r => AXES.map(ax => methodFor(r, ax.id))));
  it('includes disks', () => expect(methods.has('disk')).toBe(true));
  it('includes washers', () => expect(methods.has('washer')).toBe(true));
  it('includes shells', () => expect(methods.has('shell')).toBe(true));
});

describe('methodReason', () => {
  it('names the disk case and says why', () => {
    const [m, why] = methodReason(region('cone'), 'x');
    expect(m).toBe('disk');
    expect(why).toMatch(/sits on the x-axis/);
  });
  it('names the washer case for a region with a hole', () => {
    expect(methodReason(region('band'), 'x')[0]).toBe('washer');
  });
  it('names the shell case about y regardless of a hole', () => {
    expect(methodReason(region('cone'), 'y')[0]).toBe('shell');
    expect(methodReason(region('band'), 'y')[0]).toBe('shell');
  });
  it('agrees with the engine on every region and axis', () => {
    REGIONS.forEach(r => AXES.forEach(ax => {
      expect(methodReason(r, ax.id)[0]).toBe(methodFor(r, ax.id));
    }));
  });
});

describe('regions are safe to revolve', () => {
  REGIONS.forEach(r => {
    it(`${r.id}: lies at x ≥ 0, so revolving about y never double-covers`, () => {
      expect(r.a).toBeGreaterThanOrEqual(0);
    });
    it(`${r.id}: the outer boundary never dips below the inner one`, () => {
      for (let i = 0; i <= 40; i++) {
        const x = r.a + (r.b - r.a) * i / 40;
        expect(r.f(x)).toBeGreaterThanOrEqual((r.g ? r.g(x) : 0) - 1e-12);
      }
    });
    it(`${r.id}: is finite across its interval`, () => {
      for (let i = 0; i <= 40; i++) {
        const x = r.a + (r.b - r.a) * i / 40;
        expect(Number.isFinite(r.f(x))).toBe(true);
      }
    });
  });
});

describe('the challenge is honest at every region and axis', () => {
  const TOL_FRAC = 0.005;    // mirrors playground.js: within 0.5% of exact
  const N_MIN = 2, N_MAX = 40;

  REGIONS.forEach(r => AXES.forEach(ax => {
    const exact = r.exact[ax.id];
    it(`${r.id} about ${ax.id}: solvable by n = ${N_MAX}`, () => {
      const err = Math.abs(volumeSum(r, ax.id, N_MAX) - exact) / Math.abs(exact);
      expect(err).toBeLessThan(TOL_FRAC);
    });
  }));

  it('is not already solved at the opening n for the regions with curvature', () => {
    // `root` about x has a linear integrand, so midpoint is exact even at n = 2 —
    // that is a genuine property worth showing, not a bug, so it is excluded.
    const curved = REGIONS.filter(r => !(r.id === 'root'));
    curved.forEach(r => {
      const err = Math.abs(volumeSum(r, 'x', N_MIN) - r.exact.x) / Math.abs(r.exact.x);
      expect(err).toBeGreaterThan(TOL_FRAC);
    });
  });
});

describe('exact-at-any-n detection', () => {
  it('flags √x about x, where the integrand π(√x)² = πx is linear', () => {
    expect(isExactAtAnyN(region('root'), 'x', volumeSum)).toBe(true);
  });

  it('does not flag the same region about y, where it is a genuine limit', () => {
    expect(isExactAtAnyN(region('root'), 'y', volumeSum)).toBe(false);
  });

  it('does not flag any other region on either axis', () => {
    REGIONS.filter(r => r.id !== 'root').forEach(r =>
      AXES.forEach(ax => expect(isExactAtAnyN(r, ax.id, volumeSum)).toBe(false)));
  });

  it('every case it does NOT flag starts unsolved at the opening n = 2', () => {
    const TOL_FRAC = 0.005;
    REGIONS.forEach(r => AXES.forEach(ax => {
      if (isExactAtAnyN(r, ax.id, volumeSum)) return;
      const err = Math.abs(volumeSum(r, ax.id, 2) - r.exact[ax.id]) / Math.abs(r.exact[ax.id]);
      expect(err).toBeGreaterThan(TOL_FRAC);
    }));
  });
});
