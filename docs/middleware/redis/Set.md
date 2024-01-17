# SET

`SET`集合结构可以`无序`、`不重复`的存储`多个字符串`。类比Java中的`Map<key, Set<String>>`结构。

| 命令                    | 作用                                                         |
| ----------------------- | ------------------------------------------------------------ |
| SADD                    | 将给定元素添加到集合中                                       |
| SMEMBERS                | 返回集合包含的所有元素                                       |
| SISMEMBER               | 检查指定元素是否存在集合中                                   |
| SREM                    | 如果给定的元素存在于集合中，那么移除该元素                   |
| `SCARD`                 | 返回集合中元素的数量                                         |
| SRANDMEMBER key [count] | 从集合里面随机返回一个或多个元素，count>0返回不重复，<0则会重复 |
| SPOP                    | 随机的从集合中移除一个元素并返回                             |
| SMOVE                   | 从source中移除元素并添加到dest中，成功为1，否则为0           |

```shell
# 添加元素到指定key的值集合中，返回添加的数量
$ SADD set hello world ya
"3"
# 获取集合中的全部元素
$ SMEMBERS set
1) "world"
2) "ya"
3) "hello"
# 查询hello是否存在key为set的值集合中
$ SISMEMBER set hello
"1"
$ SISMEMBER set hello1
"0"
# 如果hello存在key为set的值集合中，那么移除该元素
$ SREM set hello
"1"
$ SREM set hello
"0"
```

#### 多个集合的处理命令

| 命令                    | 作用                            |
| ----------------------- | ------------------------------- |
| SDIFF `<key> [<key>...]`  | 多个集合取`差集`                |
| SDIFFSTORE              | 多个集合取差集将结果存入某个key |
| SINTER `<key> [<key>...]` | 多个集合取`交集`                |
| SINTERSTORE             | 多个集合取交集将结果存入某个key |
| SUNION `<key> [<key>...]` | 多个集合取`并集`                |
| SUNIONSTORE             | 多个集合取并集将结果存入某个key |

```shell
$ SADD set1 hello
$ SADD set2 world
# 返回set1与set2的差集
$ SDIFF set1 set2
1)  "hello"
# 将差集结果存入res
$ SDIFFSTORE res set1 set2
"1"
# 取交集
$ SINTER set1 set2
<空>
# 取并集
$ SUNION set1 set2
"world"
"hello"
```
