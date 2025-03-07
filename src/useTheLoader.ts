import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type CompareFunction, useTheParams } from './useTheParams';

// @ts-ignore args P
export type LoaderFunc<T = any, P = any> = (...args: P) => Promise<T>; // eslint-disable-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoaderReturn<L> = L extends LoaderFunc<infer T, any> ? T : unknown;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoaderArgs<L> = L extends LoaderFunc<any, infer P> ? P : unknown;

type BeforeLoadReturn = void;

export type UseTheLoaderOptions<
  L extends LoaderFunc,
  P extends LoaderArgs<L>,
  T extends LoaderReturn<L>,
> = {
  loader: L;
  params: P;
  onChangeParams?: (params: P) => void;
  compare?: CompareFunction;
  debug?: boolean;
  debugParams?: boolean;
  canLoad?: boolean | ((params: P) => boolean);
  beforeLoad?: (params: P) => BeforeLoadReturn | Promise<BeforeLoadReturn>;
  onLoad?: (loadData: T, params: P) => void;
  filter?: (loadData: T) => T;
};

export enum LoaderState {
  init,
  loading,
  loaded,
  error,
}

export type LoadState<T> = {
  state: LoaderState;
  data?: T;
  error?: Error;
};

export type UseTheLoaderReturn<T, P> = LoadState<T> & {
  loading: boolean;
  reloading: boolean;
  loadTimes: number;
  setLoadTimes: Dispatch<SetStateAction<number>>;
  load: (reload?: boolean) => Promise<void>;
  params: P;
  setParams: (p: P | ((p: P) => P)) => void;
};

export function useTheLoader<
  L extends LoaderFunc,
  P extends LoaderArgs<L>,
  T extends LoaderReturn<L>,
>({
    loader,
    params,
    onChangeParams,
    compare,
    debug,
    debugParams,
    filter,
    canLoad,
    onLoad,
    beforeLoad,
  }: UseTheLoaderOptions<L, P, T>): UseTheLoaderReturn<T, P> {
  const [args, setParams] = useTheParams<P>(params, {
    compare,
    onChange: onChangeParams,
    debug: debug || debugParams,
  });

  const shouldLoad = useMemo(() => {
    if (typeof canLoad === 'function') {
      return canLoad(args);
    }
    return canLoad == null ? true : canLoad;
  }, [args, canLoad]);

  const stateRef = useRef(LoaderState.init);

  const [loadState, setLoadState] = useState<LoadState<T>>({
    state: shouldLoad ? LoaderState.loading : LoaderState.init,
  });
  const [loadTimes, setLoadTimes] = useState(0);

  const loading = loadState.state === LoaderState.loading;
  const reloading = loading && loadTimes > 0;

  const filterError = (err: unknown): Error => {
    if (err instanceof Error) return err;
    return new Error(`${err}`);
  };

  const load = useCallback(
    async (reload = false) => {
      const canFetch =
        stateRef.current === LoaderState.init ||
        (reload && stateRef.current !== LoaderState.loading);
      if (!canFetch) return;
      stateRef.current = LoaderState.loading;
      setLoadState(prev => ({ ...prev, state: stateRef.current }));
      try {
        const cloneArgs = args.slice();
        beforeLoad && (await beforeLoad(cloneArgs));
        // @ts-ignore args
        const data = await loader(...cloneArgs);
        onLoad && onLoad(data, cloneArgs);
        debug && console.log('loader#loaded', data);
        stateRef.current = LoaderState.loaded;
        setLoadState({
          state: stateRef.current,
          data: filter ? filter(data) : data,
        });
      } catch (err) {
        stateRef.current = LoaderState.error;
        setLoadState({ state: stateRef.current, error: filterError(err) });
        debug && console.log('loader#error', err);
      } finally {
        setLoadTimes(prev => prev + 1);
      }
    },
    [shouldLoad, args, loadState.state],
  );

  useEffect(() => {
    if (!shouldLoad) return;
    if (stateRef.current === LoaderState.init) {
      debug && console.log('loader#firstLoad', args);
      load();
    } else if (
      stateRef.current === LoaderState.loaded ||
      stateRef.current === LoaderState.error
    ) {
      debug && console.log('loader#reload', args);
      load(true);
    }
  }, [shouldLoad, args]);

  return {
    ...loadState,
    loading,
    reloading,
    loadTimes,
    setLoadTimes,
    load,
    params: args,
    setParams,
  };
}
