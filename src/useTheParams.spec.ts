import 'mocha';
import { inject } from 'inject-jsdom';
import { renderHook, act } from '@testing-library/react';
import { assert } from 'chai';
import { useState } from 'react';
import { useTheParams } from './useTheParams';

inject({
  html: '<html><body><div id="test" data-value="test"></div></body></html>',
  url : 'http://localhost',
});

describe('useTheParams', function () {
  describe('basic type test', function () {
    it('object type', function () {
      const params = { a: 'a', key: 123 };
      const { result } = renderHook(() => useTheParams(params));

      assert.deepEqual(result.current[0], params);
    });

    it('array type', function () {
      const params = ['a', 'b', 'c'];
      const { result } = renderHook(() => useTheParams(params));

      assert.deepEqual(result.current[0], params);
    });

    it('string type', function () {
      const params = 'test';
      const { result } = renderHook(() => useTheParams(params));

      assert.equal(result.current[0], params);
    });

    it('number type', function () {
      const params = 123;
      const { result } = renderHook(() => useTheParams(params));

      assert.equal(result.current[0], params);
    });
  });

  describe('update', function () {
    it('mixed', function () {
      const basic = { id: 'id', keys: ['a', 'b', 'c'], boolean: false };
      const changed = { id: 'changed', keys: ['e', 'f', 'g'], boolean: true };

      const { result } = renderHook(() => {
        const [id, setId] = useState(basic.id);
        const [keys, setKeys] = useState(basic.keys);
        const [boolean, setBoolean] = useState(basic.boolean);
        const [params] = useTheParams({ id, keys, boolean });
        return {
          params,
          update: () => {
            setId(changed.id);
            setKeys(changed.keys);
            setBoolean(changed.boolean);
          },
        };
      });

      assert.deepEqual(result.current.params, basic);

      act(() => {
        result.current.update();
      });

      assert.deepEqual(result.current.params, changed);
    });

    it('onChange', function () {
      const basic = { id: 'id' };
      const changed = { id: 'change-id' };
      let changedTimes = 0;

      const { result } = renderHook(() => {
        const [id, setId] = useState(basic.id);
        const [params] = useTheParams({ id }, {
          onChange: () => {
            changedTimes++;
          },
        });
        return {
          params,
          update: () => {
            setId(changed.id);
          },
        };
      });

      assert.deepEqual(result.current.params, basic);
      assert.equal(changedTimes, 0);

      act(() => {
        result.current.update();
      });

      assert.deepEqual(result.current.params, changed);
      assert.equal(changedTimes, 1);
    });

    it('setParams', function () {
      const basic = ['id', 'abc', 1];
      const changed = ['change-id', 'efg', 2];
      let changedTimes = 0;

      const { result } = renderHook(() => {
        return useTheParams(basic, { onChange: () => changedTimes++ });
      });

      assert.deepEqual(result.current[0], basic);
      assert.equal(changedTimes, 0);

      act(() => {
        result.current[1](changed);
      });

      assert.deepEqual(result.current[0], changed);
      assert.equal(changedTimes, 1);
    });

    it('setParams-callback', function () {
      const id = 'id';
      const changeId = 'changed-id';
      const basic = { id, value: 'any-value' };
      let changedTimes = 0;

      const { result } = renderHook(() => {
        return useTheParams(basic, { onChange: () => changedTimes++ });
      });

      assert.deepEqual(result.current[0], basic);
      assert.equal(changedTimes, 0);

      act(() => {
        result.current[1](prev => ({ ...prev, id: changeId }));
      });

      assert.deepEqual(result.current[0], { ...basic, id: changeId });
      assert.equal(changedTimes, 1);
    });

    it('customCompare', function () {
      const customCompare = (o1: unknown, o2: unknown): boolean => JSON.stringify(o1) === JSON.stringify(o2);

      const basic = ['id', 'abc', 1];
      const changed = ['change-id', 'efg', 2];

      const { result } = renderHook(() => {
        return useTheParams(basic, customCompare);
      });

      assert.deepEqual(result.current[0], basic);
      act(() => {
        result.current[1](changed);
      });
      assert.deepEqual(result.current[0], changed);
    });
  });
});
