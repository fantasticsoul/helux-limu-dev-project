export const EVENT_NAME = {
  ON_DATA_CHANGED: 'ON_DATA_CHANGED',
} as const;

export const LOADING_MODE = {
  NONE: 'NONE',
  PRIVATE: 'PRIVATE',
  GLOBAL: 'GLOBAL',
} as const;

export const WAY = {
  FIRST_RENDER: 'FIRST_RENDER',
  EVERY_RENDER: 'EVERY_RENDER',
} as const;
