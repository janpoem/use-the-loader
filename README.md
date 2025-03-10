# use-the-loader

[![version](https://img.shields.io/npm/v/use-the-loader?style=for-the-badge)](https://www.npmjs.com/package/use-the-loader)
[![dw](https://img.shields.io/npm/dw/use-the-loader?style=for-the-badge)](https://www.npmjs.com/package/use-the-loader)

又又又又双双双叒叒叕一个 React 的数据加载钩子。

## 设计理念

**use-the-loader** 的设计概念是：将任何符合 `(...params: T) => Promise<R>` 描述的
JS 函数视作一个 `loader`，并观测 `params` 的变化以触发 loader 自动重载。

- `loader` 函数根据实现函数，进行泛型推断
- 其中 `...params: T` 将抽取为参数元祖（Tuple）

```tsx
import { useState } from 'react';
import { useTheLoader } from './useTheLoader';

// 输入参数：为元祖 [string, number]，因为 TS 的局限性，这个元祖是无法动态声明的，但通过泛型推断可以得到
// 返回结果：Promise<{id: string, version?: number}>
const fetchData = (id: string, version?: number) => Promise.resolve({
  id,
  version,
});

function TestComponent({ version }: { version?: number }) {
  const [id, setId] = useState('abc');

  // 这里不需要额外的泛型指定，自动根据 fetchData 函数的推导推断出 params 的类型和 data 的类型
  // params 必须符合 [string, number]，否则 ts-check 将会报错
  // data 的推导类型则是 {id: string, version?: number} | undefined
  const { data } = useTheLoader({
    loader: fetchData,
    params: [id, version],
  });

  return <div>{data && JSON.stringify(data)}</div>;
}
```

接口实现的复杂性，不应该体现在 hooks 或者 view（组件代码） 层面，而应该由实现接口的函数负责。
特别强烈批判诸如 `redux-toolkit` `useQuery` 搞的各种神神怪怪的机制和配置，
让 hooks 或者 view（组件代码） 层面的代码变得越发复杂和臃肿。

实际项目（经验）里，接口实现函数（类），我们可以有单独的单元测试、接口测试（或通过
open-api 生成），确保可用性和健壮性。

**use-the-loader** 旨在用很薄一层的逻辑代码，将任何 JS 函数视作 loader ，并轻松用于
hooks 或者 view（组件代码）。

用更哲学的表述是：我们将任何 JS 异步函数抽象成 loader 以使用。

> 大道至简，各方妖孽速速退散

该库提供两个基础的 hooks：

- useTheLoader - 关注由 params 变化触发的数据加载（不限制如何实现 loader）。
- useTheParams - 将多个任意的 prop 、state 、变量，构建成一个参数组合，并跟踪该参数的变化。

## useTheLoader

又又又一个 React 的数据加载钩子。

- 不关注如何缓存
- 不关注如何实现（到底是 fetch 还是 axios，还是 graphql，还是啥）
- 只需要一个 `loader` 函数
- 以及 `loader` 函数的参数 `params`

`useTheLoader` 提供：

- 泛型设计，准确定位（编辑器可智能识别，自动提示） `loader`、`loader` 参数，`loader` 的
  `Promise<infer T>`
- 根据 `params` 变化，自动 reload
- 可控 `canLoad(params)`
- 前置 `beforeLoad(params)` ，以修正实际 loader 的参数
- 后置 `onLoad(data, params)`，以便于对数据分割处理
- 过滤器 `filter(data)` ，以便于数据加工过滤

**基础用法**

```typescript jsx
import { useSearch } from '@tanstack/react-location';
import { useState } from 'react';
import { axios } from 'axios';
import { useTheLoader } from 'use-the-loader';

type LoaderQuery = {
  type?: string,
  page?: number,
  search?: string,
}

type LoaderData = {
  data: Record<string, unknown>,
  otherInfo?: Record<string, unknown>,
  filtered?: boolean,
}

const loader = (id: string, query: LoaderQuery): Promise<LoaderData> => new Promise<LoaderData>((resolve, reject) => {
  axios.request({ url: '....' })
    .then(resp => resolve(resp.data))
    .catch(err => reject(err));
})

type AnyComponentProps = {
  id?: string,
}

function AnyComponent({ id }: AnyComponentProps) {
  // Router 的 url 查询字符串变量
  const { page, search } = useSearch();
  // 组件内 state
  const [type, setType] = useState('user');

  const [otherInfo, setOtherInfo] = useState<Record<string, unknown> | undefined>(undefined);

  const { state, data, loading, reloading, } = useTheLoader({
    // 必须，loader 本体，决定了 params 参数的类型以及 data 的类型
    loader: loader,
    // 必须，参数构成
    params: [id, { type, page, search }],
    // 可选，是否可加载，不指定时，默认为 true
    canLoad: () => id != null,
    // 可选，加载数据前
    beforeLoad: ([, q]) => {
      q.type = q.type == null ? '' : q.type;
    },
    // 可选，加载数据后
    onLoad: (d) => {
      setOtherInfo(d.otherInfo);
    },
    // 可选，对加载的数据进行过滤
    filter: (d) => ({ ...d, filtered: true })
  });

  // 组件输出 ...
  return <div>AnyComponent</div>;
}
```

注意：当 loader 处于 loading 状态（未加载完毕）时，params 变化不会触发数据 reload。

## useTheParams

本来 React 的 `useState` 是一个十分简单且美妙的东西，我们总是乐于从基础的 state
去构建组件或 hook。

但不可避免的是多个属性（prop）或state，需要做组合，成为一个数组或object，再关注这个组合的变化，去触发下一层的操作。

这时候基于 `useEffect`，总是力有不逮（浅层比较深度不足，逻辑越做越复杂）。

这时候你可以选择诸如 `useReducer`, `Redux` 或 `Mobx`
等等，不过不管用哪个，你的代码都将变得越发庞大，需要学习的东西也越多（需要掌控和制定的规范也越来越多）。

回到问题的本质，我们需要的，只是一个组合追踪而已，为什么要让事情变复杂？

所以就有了这个 `useTheParams`，当你在为各种各样的 prop、state 疲于奔命时，用
`useTheParams` 就对了，一下子全解决了。

**主要特性**

- 泛型设计 - `useTheParams` 不锁定到底是数组还是 object，还是一个字符串，你传入什么，类型就是什么。
- 可自定义 `compare`
  方法，默认使用了 [just-compare](https://www.npmjs.com/package/just-compare)
- `onChange` 事件

**基础用法**

```typescript jsx
import { useSearch } from '@tanstack/react-location';
import { useState } from 'react';
import { useTheParams } from 'use-the-loader';

type AnyComponentProps = {
  id?: string,
}

function AnyComponent({ id }: AnyComponentProps) {
  // Router 的 url 查询字符串变量
  const { page, search } = useSearch();
  // 组件内 state
  const [type, setType] = useState('user');

  const [params, setParams] = useTheParams(
    // 构成 params 的数据，
    // 当这些数据变动时，将自动触发 params onChange
    { id, type, page, search },
    {
      onChange: (p) => {
        // 当 params 变化时触发
      },
      // 自定义比较函数
      compare: (v1, v2) => v1 === v2,
    }
  );

  // 组件输出 ...
  return <div>AnyComponent</div>;
}
```

## 更新日志

### 1.0.5

- 更改项目构建环境为 bun.js
- 切换 compare 函数为 `react-fast-compare`
    - 导出 `compare` 函数
    - `react-fast-compare` 打包构建包含
- 调整 `esm => .mjs` （部分前端工具里对 esm js 识别有些问题）
- `useTheParams` 调整实现
- 测试代码适配 bun.js

### 1.0.4

- 增加 enum `LoaderState`
- 部分流程优化
- 增加导出 `esm` ，调整 `esm => .js`、`cjs => .cjs` 后缀格式
- 更新 rollup 编译环境，改用 `rollup-plugin-swc3` 和 `rollup-plugin-dts`
