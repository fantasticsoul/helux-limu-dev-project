import { Middleware } from '../../types';
import { getHelp } from '../root';

const { middlewares } = getHelp();

export function addMiddle(mid: Middleware) {
  middlewares.push(mid);
}

export function runMiddlewares() {
  
}