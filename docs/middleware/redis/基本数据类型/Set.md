# Set

`Set` 集合结构可以 `无序`、`不重复` 的存储 `多个字符串`。类比 Java 中的 `Map<key, Set<String>>` 结构。

| 命令                      | 作用                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `SADD`                    | 将给定元素添加到集合中                                       |
| `SMEMBERS`                | 返回集合包含的所有元素                                       |
| `SISMEMBER`               | 检查指定元素是否存在集合中                                   |
| `SREM`                    | 如果给定的元素存在于集合中，那么移除该元素                   |
| `SCARD`                   | 返回集合中元素的数量                                         |
| `SRANDMEMBER key [count]` | 从集合里面随机返回一个或多个元素，count>0 返回不重复，<0 则会重复 |
| `SPOP`                    | 随机地从集合中移除一个元素并返回                             |
| `SMOVE`                   | 从 source 中移除元素并添加到 dest 中，成功为 1，否则为 0       |

```shell
# 添加元素到指定 key 的值集合中，返回添加的数量
SADD set hello world ya
(integer) 3

# 获取集合中的全部元素
SMEMBERS set
1) "world"
2) "ya"
3) "hello"

# 查询 hello 是否存在 key 为 set 的值集合中
SISMEMBER set hello
(integer) 1

SISMEMBER set hello1
(integer) 0

# 如果 hello 存在 key 为 set 的值集合中，那么移除该元素
SREM set hello
(integer) 1

SREM set hello
(integer) 0
```

## 多个集合的处理命令

| 命令                          | 作用                            |
| ----------------------------- | ------------------------------- |
| `SDIFF <key> [<key>...]`      | 多个集合取 `差集`                 |
| `SDIFFSTORE`                  | 多个集合取差集将结果存入某个 key |
| `SINTER <key> [<key>...]`     | 多个集合取 `交集`                 |
| `SINTERSTORE`                 | 多个集合取交集将结果存入某个 key |
| `SUNION <key> [<key>...]`     | 多个集合取 `并集`                 |
| `SUNIONSTORE`                 | 多个集合取并集将结果存入某个 key |

```shell
SADD set1 hello
SADD set2 world

# 返回 set1 与 set2 的差集
SDIFF set1 set2
1) "hello"

# 将差集结果存入 res
SDIFFSTORE res set1 set2
(integer) 1

# 取交集
SINTER set1 set2
(empty array)

# 取并集
SUNION set1 set2
1) "world"
2) "hello"
```
