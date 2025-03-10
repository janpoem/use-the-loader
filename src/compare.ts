import isEqual from 'react-fast-compare';

export type CompareFunction = (v1: unknown, v2: unknown) => boolean;

export const compare: CompareFunction = isEqual;
