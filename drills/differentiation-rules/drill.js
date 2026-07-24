import { ScoreShell } from '../../engine/score-shell.js';
import { createConfetti } from '../../engine/confetti.js';
import { mountNav } from '../../engine/sequencer.js';
import { mountPresenter } from '../../engine/dom.js';
import { makeRng } from '../../engine/drill/rng.js';
import { mountDrill } from '../../engine/drill/drill-shell.js';

const params = new URLSearchParams(location.search);
const seed = params.has('seed') ? (Number(params.get('seed')) >>> 0) : ((Math.random() * 2 ** 32) >>> 0);
const rng = makeRng(seed);

const shell = new ScoreShell(createConfetti(), { slug: 'differentiation-rules' });
mountNav('differentiation-rules');
mountDrill({ root: 'drill-root', rng, shell });
mountPresenter();
