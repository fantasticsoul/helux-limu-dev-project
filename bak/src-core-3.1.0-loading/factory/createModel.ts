import * as api from '../api';
import { FactoryFn, ModelFactory, HeluxApi } from '../types-model';

function createModelLogic<T = any>(cb: FactoryFn<T>, extra?: any): T {
  return cb(api, extra);
}

export function createModel<T = any>(cb: (api: HeluxApi) => T): T {
  return createModelLogic(cb);
}

export function createModelFactory<T = any>(factory: FactoryFn<T>): ModelFactory<T> {
  return {
    build: (extra?: any) => {
      return createModelLogic<T>(factory, extra);
    }
  }
}
