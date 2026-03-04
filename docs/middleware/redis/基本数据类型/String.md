# String

可以存储 `字符串 `、` 整数` 或`浮点数`。

| 命令          | 作用                                                         |
| ------------- | ------------------------------------------------------------ |
| `GET`         | 获取存储在指定 key 的值                                      |
| `SET`         | 设置存储在指定 key 的值                                      |
| `DEL`         | 删除存储在指定 key 的值 (任何类型都通用)                     |
| `INCR`        | 将键存储的值加 1                                             |
| `DECR`        | 将键存储的值减 1                                             |
| `INCRBY`      | 将键存储的值加上整数                                         |
| `DECRBY`      | 将键存储的值减去整数                                         |
| `INCRBYFLOAT` | 将键存储的值加上浮点数                                       |
| `APPEND`      | 将 value 追加到旧值后，返回追加后值长度                      |
| `GETRANGE`    | 获取指定闭区间的字符串                                       |
| `SETRANGE`    | 从某个 index 开始替换字符串                                  |
| `GETBIT`      | 将字符串转换为二进制位串，并返回位串中指定 index 的二进制位值 |
| `SETBIT`      | 将二进制串中指定 index 替换为指定的值                        |
| `BITCOUNT`    | 统计二进制串中指定区间内值为 1 的数量                        |
| `BITOP`       | 将多个二进制位串进行位运算并把结果保存在指定 key 中          |

```shell
# 设置 key 的值
SET hello world
# 获取 key 的值
GET hello
# 删除指定 key 的 value，返回删除成功的数量
DEL hello
# 获取 key 的值，不存在返回 (nil)
GET hello
# 将 hello 追加到旧值后
APPEND hello hello
# 获取字符串 [0,4]
GETRANGE hello 0 4
# 从下标 5 开始替换为 world
SETRANGE hello 5 world
```

> 1. Redis 中 key `大小写敏感`，`GET HELLO` 不同于 `GET hello`
> 2. `keys *` 可以查看全部的 keys
