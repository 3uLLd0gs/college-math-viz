/* A pure hint-ladder state machine: reveal one step per call, no DOM. */

export function makeHintLadder(steps) {
  let i = 0;
  return {
    reveal() { return i < steps.length ? steps[i++] : null; },
    get revealed() { return steps.slice(0, i); },
    get done() { return i >= steps.length; },
    get remaining() { return steps.length - i; },
  };
}
