# use-the-loader

[![version](https://img.shields.io/npm/v/use-the-loader?style=for-the-badge)](https://www.nnpmjs.com/package/use-the-loader)
[![dw](https://img.shields.io/npm/dw/use-the-loader?style=for-the-badge)](https://www.npmjs.com/package/use-the-loader)

> Another React loader hook. Keep things simple.

## 设计理念

**use-the-loader** 设计理念非常简单：将任何 `(...params: T) => Promise<R>` 形式的 JS 函数视作一个 `loader`，并自动检测参数变化触发重载。

- 完全通过 TypeScript 泛型自动推断类型，无需手动指定
- 不关心你的数据来源（fetch/axios/graphql 都可以）
- 不引入复杂的缓存机制和配置选项
- 将接口实现的复杂性留在 loader 函数内部，保持组件代码简洁

相比于那些重型的数据获取库，use-the-loader 坚信：**接口实现逻辑应该由专门的单元测试保证，组件层不需要承担额外的复杂度**。

```tsx
import { useState } from 'react';
import { useTheLoader } from './useTheLoader';

// 输入参数：[string, number]，自动推断
// 返回结果：Promise<{id: string, version?: number}>
const fetchData = (id: string, version?: number) => Promise.resolve({
  id,
  version,
});

function TestComponent({ version }: { version?: number }) {
  const [id, setId] = useState('abc');

  // 自动推断类型：params 必须符合 [string, number]，data 类型是 {id: string, version?: number} | undefined
  const { data } = useTheLoader({
    loader: fetchData,
    params: [id, version],
  });

  return <div>{data && JSON.stringify(data)}</div>;
}
```

## 核心 API

### `useTheLoader`

数据加载 Hook，关注由参数变化触发的数据加载。

```ts
const { 
  data,           // 加载的数据
  state,          // LoaderState (init: 0, loading: 1, loaded: 2, error: 3)
  error,          // 加载错误（unknown 类型）
  loading,        // 是否正在加载中
  reloading,      // 是否正在重新加载（第一次加载后）
  loadTimes,      // 已加载次数
  params,         // 当前参数
  setParams,      // 直接设置参数
  load,           // 手动触发加载 (reload?: boolean) => Promise<void>
} = useTheLoader({
  loader,         // 加载函数 (...args) => Promise<T>
  params,         // 参数数组，必须与 loader 签名对应
  onChangeParams, // 可选：参数变化回调 (params: P) => void
  compare,        // 可选：自定义参数比较函数 (v1, v2) => boolean
  canLoad,        // 可选：是否允许加载 boolean | ((params: P) => boolean)
  beforeLoad,     // 可选：加载前回调 (params: P) => void | Promise<void>
  onLoad,         // 可选：加载成功回调 (data: T, params: P) => void
  onError,        // 可选：加载失败回调 (err: unknown) => void
  filter,         // 可选：数据过滤 (data: T) => T
  debug,          // 可选：开启 debug 日志
  debugParams,    // 可选：开启 params 变化日志
});
```

**完整示例：**

```tsx
import { useSearch } from '@tanstack/react-location';
import { useState } from 'react';
import { axios } from 'axios';
import { useTheLoader } from 'use-the-loader';

type LoaderQuery = {
  type?: string,
  page?: number,
  search?: string,
};

type LoaderData = {
  data: Record<string, unknown>,
  otherInfo?: Record<string, unknown>,
};

const loader = (id: string, query: LoaderQuery): Promise<LoaderData> => 
  axios.get(`/api/data/${id}`, { params: query });

type AnyComponentProps = {
  id?: string,
};

function AnyComponent({ id }: AnyComponentProps) {
  // Router 的 url 查询字符串变量
  const { page, search } = useSearch();
  // 组件内 state
  const [type, setType] = useState('user');

  const [otherInfo, setOtherInfo] = useState<Record<string, unknown> | undefined>(undefined);

  const { data, loading, error } = useTheLoader({
    // 必须：loader 本体
    loader: loader,
    // 必须：参数构成，必须和 loader 签名一致
    params: [id, { type, page, search }],
    // 可选：控制是否可加载
    canLoad: () => id != null,
    // 可选：加载前处理参数
    beforeLoad: ([, q]) => {
      q.type = q.type == null ? '' : q.type;
    },
    // 可选：加载后处理结果
    onLoad: (d) => {
      setOtherInfo(d.otherInfo);
    },
  });

  // 组件输出 ...
  return <div>AnyComponent</div>;
}
```

### `useTheParams`

参数组合 Hook，当你需要组合多个变量并检测变化时使用。

```ts
const [params, setParams] = useTheParams(
  input,                // 需要组合的参数（可以是 object | array | 基本类型）
  {
    onChange: (p) => {}, // 可选：变化回调
    compare: (v1, v2) => v1 === v2, // 可选：自定义比较函数
    debug: false,        // 可选：开启 debug 日志
  }
);
```

**基本用法：**

```tsx
import { useSearch } from '@tanstack/react-location';
import { useState } from 'react';
import { useTheParams } from 'use-the-loader';

function AnyComponent({ id }: { id?: string }) {
  const { page, search } = useSearch();
  const [type, setType] = useState('user');

  const [params] = useTheParams(
    { id, type, page, search },
    {
      onChange: (p) => {
        // params 变化时触发
      },
    }
  );

  return <div>AnyComponent</div>;
}
```

## 设计哲学

大道至简，为什么要发明一堆概念和配置来解决一个简单问题？

现在很多 React 生态中的数据获取库把简单问题复杂化：

- 要学习大量配置选项：queryKey、staleTime、cacheTime、retry、refetchOnWindowFocus...
- 要理解复杂的缓存策略
- 要记住各种边边角角的规则

而实际上，大多数场景下我们需要的仅仅是：**当参数变化了，重新调用一次接口**。

use-the-loader 的核心就是这句话，它：

- **不**绑定特定的 HTTP 客户端
- **不**做任何缓存（你可以在上游轻松实现）
- **不**提供复杂的重试机制（用 ts-utils 的 `retry` 包装 loader 即可）
- **不**要求你遵循特定的项目结构

只需要记住：`loader` 就是个异步函数，参数变化会自动重跑。就这么简单。

## 安装

```bash
npm install use-the-loader
# or
yarn add use-the-loader
# or
bun add use-the-loader
```

## 类型说明

- `error` 类型保持 `unknown`，遵循 TypeScript 官方做法。你可以使用类型守卫来判断：

```ts
if (error instanceof Error) {
  // error 是 Error 类型
  console.log(error.message);
}
```

## 调试

开启 `debug: true` 后，控制台会输出以下日志：

- `loader#firstLoad` - 首次加载
- `loader#reload` - 参数变化触发重载
- `loader#loaded` - 加载完成
- `loader#error` - 加载出错

开启 `debugParams: true`（或 `debug: true`）后，`useTheParams` 会输出参数变化日志。

## 常见问题

### 为什么不内置缓存/重试/防抖？

这些横切关注点应该在上游通过函数组合解决：

```ts
import { retry, timeout } from '@your-org/async-utils';

const { data } = useTheLoader({
  // 通过函数组合包装 loader，添加重试和超时
  loader: timeout(retry(fetchData, { attempts: 3 }), 5000),
  params: [id],
});
```

这样更加灵活，use-the-loader 不需要关心这些细节。

### `canLoad` 的用途？

当某些参数还没准备好时，可以通过 `canLoad: false` 推迟加载：

```ts
const { data } = useTheLoader({
  loader: fetchUser,
  params: [userId],
  canLoad: !!userId, // 只有 userId 存在时才加载
});
```

### `beforeLoad` 的用途？

可以在加载前修改参数，比如设置默认值：

```ts
const { data } = useTheLoader({
  loader: fetchData,
  params: [id, type],
  beforeLoad: ([id, q]) => {
    q.type = q.type || 'default';
  },
});
```

## License

MIT

## 相关项目

- [ts-utils](https://github.com/janpoem/ts-utils) - 你正在使用的 TypeScript 工具库，包含 `retry`、`timeout` 等异步工具
