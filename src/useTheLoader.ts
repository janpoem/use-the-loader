import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CompareFunction } from './compare';
import { useTheParams } from './useTheParams';

// biome-ignore lint/suspicious/noExplicitAny: generic function type requires any
export type AnyFn = (...args: any[]) => any;

type BeforeLoadReturn = unknown;

export type UseTheLoaderOptions<L extends AnyFn> = {
  loader: L;
  params: Parameters<L>;
  onChangeParams?: (params: Parameters<L>) => void;
  compare?: CompareFunction;
  canLoad?: boolean | ((params: Parameters<L>) => boolean);
  beforeLoad?: (
    params: Parameters<L>,
  ) => BeforeLoadReturn | Promise<BeforeLoadReturn>;
  onLoad?: (loadData: Awaited<ReturnType<L>>, params: Parameters<L>) => void;
  onError?: (err: unknown) => void;
  filter?: (loadData: Awaited<ReturnType<L>>) => Awaited<ReturnType<L>>;
  debug?: boolean;
  debugParams?: boolean;
};

export enum LoaderState {
  init = 0,
  loading = 1,
  loaded = 2,
  error = 3,
}

export type LoadState<T> = {
  state: LoaderState;
  data?: T;
  error?: unknown;
};

export type UseTheLoaderReturn<L extends AnyFn> = LoadState<
  Awaited<ReturnType<L>>
> & {
  loading: boolean;
  reloading: boolean;
  loadTimes: number;
  setLoadTimes: Dispatch<SetStateAction<number>>;
  load: (reload?: boolean) => Promise<void>;
  params: Parameters<L>;
  setParams: (
    p: Parameters<L> | ((p: Parameters<L>) => Parameters<L>),
  ) => void;
};

export function useTheLoader<L extends AnyFn>({
  loader,
  params,
  onChangeParams,
  compare,
  filter,
  canLoad,
  onLoad,
  onError,
  beforeLoad,
  debug,
  debugParams,
}: UseTheLoaderOptions<L>): UseTheLoaderReturn<L> {
  type P = Parameters<L>;
  type T = Awaited<ReturnType<L>>;

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const load = useCallback(
    async (reload = false) => {
      const canFetch =
        stateRef.current === LoaderState.init ||
        (reload && stateRef.current !== LoaderState.loading);
      if (!canFetch) return;
      stateRef.current = LoaderState.loading;
      setLoadState((prev) => ({ ...prev, state: stateRef.current }));
      try {
        const cloneArgs = [...args] as P;
        await beforeLoad?.(cloneArgs);
        const data: T = await loader(...cloneArgs);
        onLoad?.(data, cloneArgs);
        debug && console.log('loader#loaded', data);
        stateRef.current = LoaderState.loaded;
        setLoadState({
          state: stateRef.current,
          data: filter ? filter(data) : data,
        });
      } catch (err) {
        onError?.(err);
        debug && console.log('loader#error', err);
        stateRef.current = LoaderState.error;
        setLoadState({ state: stateRef.current, error: err });
      } finally {
        setLoadTimes((prev) => prev + 1);
      }
    },
    [
      shouldLoad,
      args,
      loadState.state,
      debug,
      filter,
      beforeLoad,
      loader,
      onLoad,
      onError,
    ],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
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
  }, [shouldLoad, args, debug]);

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
