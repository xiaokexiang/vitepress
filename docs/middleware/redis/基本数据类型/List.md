# LIST

`LIST`列表结构可以`有序`、`重复`的存储`多个字符串`。类比Java中的`Map<key, List<String>>`结构。

| 命令   | 作用                                   |
| ------ | -------------------------------------- |
| LPUSH  | 将给定的值推入列表的`左端`             |
| RPUSH  | 将给定的值推入列表的`右端`             |
| LRANGE | 获取列表指定范围的所有值               |
| LINDEX | 获取列指定位置上的单个元素             |
| LPOP   | 从列表的`左端`移除一个值，并返回该值   |
| RPOP   | 从列表的`右端`移除一个值，并返回该值   |
| LTRIM  | 对列表进行`修剪`，只保留指定范围的元素 |
| LLEN   | 返回列表的长度                         |

```shell
# 左端推入一个值，并返回该key对应的列表数量
$ LPUSH list hello
"1"
$ RPUSH list world
"2"
$ LINDEX list 0
"hello"
$ LPUSH list say
# 查询列表的全部值
$ LRANGE list 0 -1
1)  "say"
2)  "hello"
3)  "world"
# 移除列表左端值并返回
$ LPOP list
"say"
# 移除列表右端值并返回
$ RPOP list
"world"
```

#### 阻塞式列表操作

| 命令                                     | 作用                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| BLPOP [key-name...] timeout              | 1. 从第一个非空列表弹出最`左端`的元素<br>2. 或在timeout秒之内阻塞并等待可弹出元素出现 |
| BRPOP  [key-name...] timeout             | 1. 从第一个非空列表弹出最`右端`的元素<br/>2. 或在timeout秒之内阻塞并等待可弹出元素出现 |
| RPOPLPUSH `<source-key> <dest-key>`       | 从source中弹出最右边元素，<br>并推入dest最左端并返回该元素   |
| BRPOPLPUSH `<source-key> <dest-key>` timeout | 相比`RPOPLPUSH`，如果source没有元素<br>那么会阻塞等待timeout |

> 以上四个command常用于`redis队列`。

```shell
# 弹出list最左端的元素(only one)，直到5s后超时
$ BLPOP list 5
 1)  "list"
 2)  "hello"
# 弹出source最右侧元素，推入dest最左侧
$ RPOPLPUSH source dest
null
# 弹出source最右侧元素，推入dest最左侧，阻塞直到timeout
$ BRPOPLPUSH source dest
<空>
```
