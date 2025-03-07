import justCompare from 'just-compare';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type CompareFunction = (v1: unknown, v2: unknown) => boolean;

export type UseTheParamsOptions<P> = {
  compare?: CompareFunction;
  onChange?: (params: P) => void;
  debug?: boolean;
};

export function useTheParams<P>(
  input: P,
  opts?: CompareFunction | UseTheParamsOptions<P>,
): [P, Dispatch<SetStateAction<P>>] {
  const { compare, onChange, debug } = useMemo(() => initOptions(opts), [opts]);

  const ref = useRef<P>(input);
  const [params, _setParams] = useState<P>(input);

  const compareFn = useCallback(
    (v1: unknown, v2: unknown) =>
      compare ? compare(v1, v2) : justCompare(v1, v2),
    [compare],
  );

  useEffect(() => {
    if (!compareFn(ref.current, input)) {
      debug && console.log('change params', input);
      ref.current = input;
      _setParams(input);
      onChange && onChange(input);
    }
  }, [input]);

  const setParams = useCallback(
    (p: P | ((p: P) => P)) => {
      const isCallback = (x: P | ((p: P) => P)): x is (p: P) => P =>
        typeof x === 'function';
      const newParams: P = isCallback(p) ? p(params) : p;
      if (!compareFn(ref.current, newParams)) {
        ref.current = newParams;
        _setParams(newParams);
        onChange && onChange(newParams);
      }
    },
    [params],
  );

  return [params, setParams];
}

function initOptions<P>(
  opts?: CompareFunction | UseTheParamsOptions<P>,
): UseTheParamsOptions<P> {
  if (opts == null) return {};
  if (typeof opts === 'function') {
    return { compare: opts };
  }
  return opts;
}
