import justCompare from 'just-compare';

export type CompareFunction = (v1: unknown, v2: unknown) => boolean;

export const compare: CompareFunction = justCompare;
