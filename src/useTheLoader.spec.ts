import { inject } from 'inject-jsdom';
import { renderHook, act } from '@testing-library/react';
import { assert } from 'chai';
import { useState } from 'react';
import { useTheLoader } from './useTheLoader';

inject({
  html: '<html lang="en"><body><div id="test" data-value="test"></div></body></html>',
  url : 'http://localhost',
});

type AnyRecord = Record<string, unknown>;

const loaderDurationSeconds = 300;
const itDurationSeconds = 500;

type LoaderQuery = {
  id: string,
  err?: Error | string,
  type?: string,
}

type LoaderReturn<D extends AnyRecord> = {
  query: LoaderQuery,
  data?: D,
  filter?: boolean,
}

const loader = <D extends AnyRecord>(query: LoaderQuery, data?: D): Promise<LoaderReturn<D>> => new Promise((resolve, reject) =>
  setTimeout(() => {
    if (query.err) {
      reject(query.err);
    } else {
      resolve({ query, data });
    }
  }, loaderDurationSeconds),
);

describe('useTheLoader', function () {
  describe('canLoad', function () {
    it('canLoad#1', function () {
      const query = { id: 'ok' };
      const { result } = renderHook(() => useTheLoader({
        loader,
        params : [query],
        canLoad: false,
      }));

      assert.equal(result.current.state, 'init');
      assert.equal(result.current.data, undefined);
      assert.deepEqual(result.current.params, [query]);
    });

    it('canLoad#2', function () {
      const query = { id: 'ok' };
      const { result } = renderHook(() => {
        const [canLoad, setCanLoad] = useState(false);

        return {
          ...useTheLoader({
            loader,
            params : [query],
            canLoad: canLoad,
          }),
          setCanLoad,
        };
      });
      assert.equal(result.current.state, 'init');
      assert.equal(result.current.data, undefined);
      assert.deepEqual(result.current.params, [query]);

      act(() => {
        result.current.setCanLoad(true);
      });

      assert.equal(result.current.state, 'loading');
    });

    it('canLoad params change', function () {
      const { result } = renderHook(() => {
        const [type, setType] = useState('test');
        return {
          ...useTheLoader({
            loader,
            params : [{ id: 'ok', type }],
            canLoad: ([q]) => q.type !== 'test',
          }),
          setType,
        };
      });

      assert.equal(result.current.state, 'init');

      act(() => {
        result.current.setType('ok');
      });

      assert.equal(result.current.state, 'loading');
    });

    it('canLoad params#2 change', function (done) {
      const query = { id: 'ok' };
      const changedData = { key: 'a-key' };
      const { result } = renderHook(() => {
        const [data, setData] = useState<AnyRecord | undefined>(undefined);
        return {
          ...useTheLoader({
            loader,
            params : [query, data],
            canLoad: ([, d]) => d != null,
          }),
          setData,
        };
      });

      assert.equal(result.current.state, 'init');

      act(() => {
        result.current.setData(changedData);
      });

      assert.equal(result.current.state, 'loading');

      setTimeout(() => {
        assert.equal(result.current.state, 'loaded');
        assert.deepEqual(result.current.data, { query, data: changedData });
        assert.deepEqual(result.current.params, [query, changedData]);
        done();
      }, itDurationSeconds);
    });
  });

  describe('load', function () {
    it('load', function (done) {
      const query = { id: 'ok' };
      const { result } = renderHook(() => useTheLoader({
        loader,
        params : [query],
        canLoad: true,
      }));

      setTimeout(() => {
        assert.equal(result.current.state, 'loaded');
        assert.deepEqual(result.current.data, { query, data: undefined });
        assert.deepEqual(result.current.params, [query]);
        done();
      }, itDurationSeconds);
    });

    it('load-reload', function (done) {
      const basicId = 'ok';
      const changedId = 'yes';
      const { result } = renderHook(() => {
        const [id, setId] = useState(basicId);
        return {
          ...useTheLoader({
            loader,
            params : [{ id }],
            canLoad: true,
          }),
          setId,
        };
      });

      setTimeout(() => {
        assert.equal(result.current.state, 'loaded');
        assert.deepEqual(result.current.data, { query: { id: basicId }, data: undefined });
        assert.deepEqual(result.current.params, [{ id: basicId }]);

        act(() => {
          result.current.setId(changedId);
        });

        assert.equal(result.current.loading, true);
        assert.equal(result.current.reloading, true);

        setTimeout(() => {
          assert.equal(result.current.state, 'loaded');
          assert.equal(result.current.loadTimes, 2);
          assert.deepEqual(result.current.data, { query: { id: changedId }, data: undefined });
          assert.deepEqual(result.current.params, [{ id: changedId }]);
          done();
        }, itDurationSeconds);
      }, itDurationSeconds);
    });

    it('load-error', function (done) {
      const err = new Error('loader error');
      const query = { id: 'ok', err };
      const { result } = renderHook(() => useTheLoader({
        loader,
        params: [query],
      }));

      setTimeout(() => {
        assert.equal(result.current.state, 'error');
        assert.deepEqual(result.current.error, err);
        done();
      }, itDurationSeconds);
    });

    it('load-error-string', function (done) {
      const err = 'loader error';
      const query = { id: 'ok', err };
      const { result } = renderHook(() => useTheLoader({
        loader,
        params: [query],
      }));

      setTimeout(() => {
        assert.equal(result.current.state, 'error');
        assert.deepEqual(result.current.error, new Error(err));
        done();
      }, itDurationSeconds);
    });

    it('load-beforeLoad', function (done) {
      const query = { id: 'ok' };
      const type = 'new value';
      const { result } = renderHook(() => useTheLoader({
        loader,
        params    : [query],
        beforeLoad: ([q]) => {
          q.type = type; // write args
        },
      }));

      setTimeout(() => {
        assert.equal(result.current.state, 'loaded');
        // 基础请求的参数，仍然是 query
        assert.deepEqual(result.current.params, [query]);
        // 但返回的数据结果 query 加上了 beforeLoad 的数据
        assert.deepEqual(result.current.data, { query: { ...query, type }, data: undefined });
        done();
      }, itDurationSeconds);
    });

    it('load-filter', function (done) {
      const query = { id: 'ok' };
      const { result } = renderHook(() => useTheLoader({
        loader,
        params: [query],
        filter: (d) => ({ ...d, filter: true }),
      }));

      setTimeout(() => {
        assert.equal(result.current.state, 'loaded');
        // 基础请求的参数，仍然是 query
        assert.deepEqual(result.current.params, [query]);
        // 但返回的数据结果 query 加上了 beforeLoad 的数据
        assert.deepEqual(result.current.data, { query: query, data: undefined, filter: true });
        done();
      }, itDurationSeconds);
    });
  });
});
