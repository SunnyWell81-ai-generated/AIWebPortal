import { chooseAction } from './evaluate.js';
const scope = self;
scope.onmessage = e => { try {
    scope.postMessage({ id: e.data.id, decision: chooseAction(e.data.observation) });
}
catch (error) {
    scope.postMessage({ id: e.data.id, error: error instanceof Error ? error.message : String(error) });
} };
