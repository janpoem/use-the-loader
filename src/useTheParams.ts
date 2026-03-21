import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type CompareFunction, compare } from './compare';

export type UseTheParamsOptions<P> = {
  compare?: CompareFunction;
  onChange?: (next: P) => void;
  debug?: boolean;
};

export function useTheParams<P>(
  input: P,
  opts?: CompareFunction | UseTheParamsOptions<P>,
): [P, Dispatch<SetStateAction<P>>] {
  const {
    compare: userCompareFn,
    onChange,
    debug,
  } = useMemo(() => initOptions(opts), [opts]);

  // don't change by user compare function change
  const compareRef = useRef(userCompareFn ?? compare);

  const ref = useRef<P>(input);

  const [ver, setVer] = useState(0);
  const verRef = useRef(ver);

  useEffect(() => {
    if (!compareRef.current(ref.current, input)) {
      debug &&
        console.log('useTheParams#change', { prev: ref.current, next: input });
      ref.current = input;
      setVer((prev) => prev + 1);
    }
  }, [input, debug]);

  useEffect(() => {
    if (verRef.current !== ver) {
      verRef.current = ver;
      onChange?.(ref.current);
    }
  }, [ver, onChange]);

  const setParams = useCallback((next: SetStateAction<P>) => {
    const _next = isSetStateFn(next) ? next(ref.current) : next;
    if (!compareRef.current(ref.current, _next)) {
      ref.current = _next;
      setVer((prev) => prev + 1);
    }
  }, []);

  return [ref.current, setParams];
}

const isSetStateFn = <P>(x: SetStateAction<P>): x is (p: P) => P =>
  typeof x === 'function';

const initOptions = <P>(
  opts?: CompareFunction | UseTheParamsOptions<P>,
): UseTheParamsOptions<P> => {
  if (opts == null) return {};
  if (typeof opts === 'function') {
    return { compare: opts };
  }
  return opts;
};
