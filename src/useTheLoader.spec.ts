import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { renderHook, act } from '@testing-library/react-hooks';
import { useState } from 'react';
import { LoaderState, useTheLoader } from './useTheLoader';

beforeAll(() => {
  // @ts-ignore
  global.IS_REACT_ACT_ENVIRONMENT = true;
  GlobalRegistrator.register();
});

afterAll(() => {
  GlobalRegistrator.unregister();
});

type AnyRecord = Record<string, unknown>;

const loaderDurationSeconds = 200;
const itDurationSeconds = 300;

type LoaderQuery = {
  id: string;
  err?: Error | string;
  type?: string;
};

type LoaderReturn<D extends AnyRecord> = {
  query: LoaderQuery;
  data?: D;
  filter?: boolean;
};

const loader = <D extends AnyRecord>(
  query: LoaderQuery,
  data?: D,
): Promise<LoaderReturn<D>> =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      if (query.err) {
        reject(query.err);
      } else {
        resolve({ query, data });
      }
    }, loaderDurationSeconds),
  );

describe('useTheLoader', () => {
  describe('canLoad', () => {
    it('canLoad#1', () => {
      const query = { id: 'ok' };
      const { result } = renderHook(() =>
        useTheLoader({
          loader,
          params: [query],
          canLoad: false,
        }),
      );

      expect(result.current.state).toBe(LoaderState.init);
      expect(result.current.data).toBeUndefined();
      expect(result.current.params).toEqual([query]);
    });

    it('canLoad#2', () => {
      const query = { id: 'ok' };
      const { result } = renderHook(() => {
        const [canLoad, setCanLoad] = useState(false);

        return {
          ...useTheLoader({
            loader,
            params: [query],
            canLoad: canLoad,
          }),
          setCanLoad,
        };
      });

      expect(result.current.state).toBe(LoaderState.init);
      expect(result.current.data).toBeUndefined();
      expect(result.current.params).toEqual([query]);

      act(() => {
        result.current.setCanLoad(true);
      });

      expect(result.current.state).toBe(LoaderState.loading);
    });

    it('canLoad params change', () => {
      const initValue = 'test';
      const { result } = renderHook(() => {
        const [type, setType] = useState(initValue);
        return {
          ...useTheLoader({
            loader,
            params: [{ id: 'ok', type }],
            canLoad: ([q]) => q.type !== initValue,
          }),
          type,
          setType,
        };
      });

      expect(result.current.state).toBe(LoaderState.init);
      expect(result.current.type).toBe(initValue);

      const nextValue = 'ok';

      act(() => {
        result.current.setType(nextValue);
      });

      expect(result.current.state).toBe(LoaderState.loading);
      expect(result.current.type).toBe(nextValue);
      expect(result.current.params).toEqual([{ id: 'ok', type: nextValue }]);
    });

    it('canLoad params#2 change', (done) => {
      const query = { id: 'ok' };
      const changedData = { key: 'a-key' };
      const { result } = renderHook(() => {
        const [data, setData] = useState<AnyRecord | undefined>(undefined);
        return {
          ...useTheLoader({
            loader,
            params: [query, data],
            canLoad: ([, d]) => d != null,
          }),
          setData,
        };
      });

      expect(result.current.state).toBe(LoaderState.init);

      act(() => {
        result.current.setData(changedData);
      });

      expect(result.current.state).toBe(LoaderState.loading);

      setTimeout(() => {
        expect(result.current.state).toBe(LoaderState.loaded);
        expect(result.current.data).toEqual({ query, data: changedData });
        expect(result.current.params).toEqual([query, changedData]);
        done();
      }, itDurationSeconds);
    });
  });

  describe('load', () => {
    it('load', (done) => {
      const query = { id: 'ok' };
      const { result } = renderHook(() =>
        useTheLoader({
          loader,
          params: [query],
          canLoad: true,
        }),
      );

      setTimeout(() => {
        expect(result.current.state).toBe(LoaderState.loaded);
        expect(result.current.data).toEqual({ query, data: undefined });
        expect(result.current.params).toEqual([query]);
        done();
      }, itDurationSeconds);
    });

    it('load-reload', (done) => {
      const basicId = 'ok';
      const changedId = 'yes';
      const { result } = renderHook(() => {
        const [id, setId] = useState(basicId);
        return {
          ...useTheLoader({
            loader,
            params: [{ id }],
            canLoad: true,
          }),
          setId,
        };
      });

      setTimeout(() => {
        expect(result.current.state).toBe(LoaderState.loaded);
        expect(result.current.data).toEqual({
          query: { id: basicId },
          data: undefined,
        });
        expect(result.current.params).toEqual([{ id: basicId }]);

        act(() => {
          result.current.setId(changedId);
        });

        expect(result.current.loading).toBe(true);
        expect(result.current.reloading).toBe(true);

        setTimeout(() => {
          expect(result.current.state).toBe(LoaderState.loaded);
          expect(result.current.loadTimes).toBe(2);
          expect(result.current.data).toEqual({
            query: { id: changedId },
            data: undefined,
          });
          expect(result.current.params).toEqual([{ id: changedId }]);
          done();
        }, itDurationSeconds);
      }, itDurationSeconds);
    });

    it('load-error', (done) => {
      const err = new Error('loader error');
      const query = { id: 'ok', err };
      const { result } = renderHook(() =>
        useTheLoader({
          loader,
          params: [query],
        }),
      );

      setTimeout(() => {
        expect(result.current.state).toBe(LoaderState.error);
        expect(result.current.error).toEqual(err);
        done();
      }, itDurationSeconds);
    });

    it('load-error-string', (done) => {
      const err = 'loader error';
      const query = { id: 'ok', err };
      const { result } = renderHook(() =>
        useTheLoader({
          loader,
          params: [query],
        }),
      );

      setTimeout(() => {
        expect(result.current.state).toBe(LoaderState.error);
        expect(result.current.error).toEqual(err);
        done();
      }, itDurationSeconds);
    });

    it('load-beforeLoad', (done) => {
      const query = { id: 'ok' };
      const type = 'new value';
      const { result } = renderHook(() =>
        useTheLoader({
          loader,
          params: [query],
          beforeLoad: ([q]) => {
            q.type = type; // write args
          },
        }),
      );

      setTimeout(() => {
        expect(result.current.state).toBe(LoaderState.loaded);
        // 基础请求的参数，仍然是 query
        expect(result.current.params).toEqual([query]);
        // 但返回的数据结果 query 加上了 beforeLoad 的数据
        expect(result.current.data).toEqual({
          query: { ...query, type },
          data: undefined,
        });
        done();
      }, itDurationSeconds);
    });

    it('load-filter', (done) => {
      const query = { id: 'ok' };
      const { result } = renderHook(() =>
        useTheLoader({
          loader,
          params: [query],
          filter: (d) => ({ ...d, filter: true }),
        }),
      );

      setTimeout(() => {
        expect(result.current.state).toBe(LoaderState.loaded);
        // 基础请求的参数，仍然是 query
        expect(result.current.params).toEqual([query]);
        // 但返回的数据结果 query 加上了 beforeLoad 的数据
        expect(result.current.data).toEqual({
          query: query,
          data: undefined,
          filter: true,
        });
        done();
      }, itDurationSeconds);
    });
  });
});
