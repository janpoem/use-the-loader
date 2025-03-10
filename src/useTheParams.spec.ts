import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { renderHook, act } from '@testing-library/react-hooks';
import { useState } from 'react';
import { useTheParams } from './useTheParams';

beforeAll(() => {
  // @ts-ignore
  global.IS_REACT_ACT_ENVIRONMENT = true;
  GlobalRegistrator.register();
});

afterAll(() => {
  GlobalRegistrator.unregister();
});

describe('useTheParams', () => {
  describe('basic type test', () => {
    it('object type', () => {
      const params = { a: 'a', key: 123 };
      const { result } = renderHook(() => useTheParams(params));

      expect(result.current[0]).toEqual(params);
    });

    it('array type', () => {
      const params = ['a', 'b', 'c'];
      const { result } = renderHook(() => useTheParams(params));

      expect(result.current[0]).toEqual(params);
    });

    it('string type', () => {
      const params = 'test';
      const { result } = renderHook(() => useTheParams(params));

      expect(result.current[0]).toEqual(params);
    });

    it('number type', () => {
      const params = 123;
      const { result } = renderHook(() => useTheParams(params));

      expect(result.current[0]).toEqual(params);
    });
  });

  describe('update', () => {
    it('mixed', () => {
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

      expect(result.current.params).toEqual(basic);

      act(() => {
        result.current.update();
      });

      expect(result.current.params).toEqual(changed);
    });

    it('onChange', () => {
      const basic = { id: 'id' };
      const changed = { id: 'change-id' };
      let changedTimes = 0;

      const { result } = renderHook(() => {
        const [id, setId] = useState(basic.id);
        const [params] = useTheParams(
          { id },
          {
            onChange: () => {
              changedTimes++;
            },
          },
        );
        return {
          params,
          update: () => {
            setId(changed.id);
          },
        };
      });

      expect(result.current.params).toEqual(basic);
      expect(changedTimes).toBe(0);

      act(() => {
        result.current.update();
      });

      expect(result.current.params).toEqual(changed);
      expect(changedTimes).toBe(1);
    });

    it('setParams', () => {
      const basic = ['id', 'abc', 1];
      const changed = ['change-id', 'efg', 2];
      let changedTimes = 0;

      const { result } = renderHook(() => {
        return useTheParams(basic, { onChange: () => changedTimes++ });
      });

      expect(result.current[0]).toEqual(basic);
      expect(changedTimes).toBe(0);

      act(() => {
        result.current[1](changed);
      });

      expect(result.current[0]).toEqual(changed);
      expect(changedTimes).toBe(1);
    });

    it('setParams-callback', () => {
      const id = 'id';
      const changeId = 'changed-id';
      const basic = { id, value: 'any-value' };
      let changedTimes = 0;

      const { result } = renderHook(() => {
        return useTheParams(basic, { onChange: () => changedTimes++ });
      });

      expect(result.current[0]).toEqual(basic);
      expect(changedTimes).toBe(0);

      act(() => {
        result.current[1]((prev) => ({ ...prev, id: changeId }));
      });

      expect(result.current[0]).toEqual({ ...basic, id: changeId });
      expect(changedTimes).toBe(1);
    });

    it('customCompare', () => {
      const customCompare = (o1: unknown, o2: unknown): boolean =>
        JSON.stringify(o1) === JSON.stringify(o2);

      const basic = ['id', 'abc', 1];
      const changed = ['change-id', 'efg', 2];

      const { result } = renderHook(() => {
        return useTheParams(basic, customCompare);
      });

      expect(result.current[0]).toEqual(basic);

      act(() => {
        result.current[1](changed);
      });

      expect(result.current[0]).toEqual(changed);
    });
  });
});
