import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { CompareFunction, useTheParams } from './useTheParams';

// @ts-ignore args P
export type LoaderFunc<T = any, P = any> = (...args: P) => Promise<T>; // eslint-disable-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoaderReturn<L> = L extends LoaderFunc<infer T, any> ? T : unknown;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoaderArgs<L> = L extends LoaderFunc<any, infer P> ? P : unknown;

type BeforeLoadReturn = void;

export type UseTheLoaderOptions<L extends LoaderFunc, P extends LoaderArgs<L>, T extends LoaderReturn<L>> = {
  loader: L,
  params: P,
  onChangeParams?: (params: P) => void,
  compare?: CompareFunction,
  debug?: boolean,
  debugParams?: boolean,
  canLoad?: boolean | ((params: P) => boolean),
  beforeLoad?: (params: P) => BeforeLoadReturn | Promise<BeforeLoadReturn>
  onLoad?: (loadData: T, params: P) => void,
  filter?: (loadData: T) => T,
}

export type LoadState<T> = {
  state: 'init' | 'loading' | 'loaded' | 'error',
  data?: T,
  error?: Error,
}

export type UseTheLoaderReturn<T, P> = LoadState<T> & {
  loading: boolean,
  reloading: boolean,
  loadTimes: number,
  setLoadTimes: Dispatch<SetStateAction<number>>
  load: (reload?: boolean) => Promise<void>,
  params: P,
  setParams: (p: P | ((p: P) => P)) => void,
}

export function useTheLoader<L extends LoaderFunc, P extends LoaderArgs<L>, T extends LoaderReturn<L>>({
  loader,
  params,
  onChangeParams,
  compare,
  debug, debugParams,
  filter,
  canLoad,
  onLoad,
  beforeLoad,
}: UseTheLoaderOptions<L, P, T>): UseTheLoaderReturn<T, P> {

  const [args, setParams] = useTheParams<P>(params, {
    compare,
    onChange: onChangeParams,
    debug   : debug || debugParams,
  });

  const shouldLoad = useMemo(() => {
    if (typeof canLoad === 'function') {
      return canLoad(args);
    }
    return canLoad == null ? true : canLoad;
  }, [args, canLoad]);

  const [loadState, setLoadState] = useState<LoadState<T>>({ state: 'init' });
  const [loadTimes, setLoadTimes] = useState(0);

  const loading = loadState.state === 'loading';
  const reloading = loading && loadTimes > 0;

  const filterError = (err: unknown): Error => {
    if (err instanceof Error) return err;
    return new Error(`${err}`);
  };

  const load = useCallback(async (reload = false) => {
    const canFetch = loadState.state === 'init' || (reload && loadState.state !== 'loading');
    if (!canFetch) return;
    setLoadState(prev => ({ ...prev, state: 'loading' }));
    try {
      const cloneArgs = args.slice();
      beforeLoad && await beforeLoad(cloneArgs);
      // @ts-ignore args
      const data = await loader(...cloneArgs);
      onLoad && onLoad(data, cloneArgs);
      debug && console.log('loader#loaded', data);
      setLoadState({ state: 'loaded', data: filter ? filter(data) : data });
    } catch (err) {
      setLoadState({ state: 'error', error: filterError(err) });
      debug && console.log('loader#error', err);
    } finally {
      setLoadTimes(prev => prev + 1);
    }
  }, [shouldLoad, args, loadState.state]);

  useEffect(() => {
    if (!shouldLoad) return;
    if (loadState.state === 'init') {
      debug && console.log('loader#firstLoad', args);
      load();
    } else if (loadState.state === 'loaded' || loadState.state === 'error') {
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
