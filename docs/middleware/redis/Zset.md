# ZSET

`ZSET`结构是`有序`、`不重复`的存储多个键值对。其中有序集合的键被称为`成员(member)`，值被称为`分值(score)`，分值必须为浮点数。`ZSET`是redis中唯一一个既可以根据`成员`访问，也可以根据`分值及分值的排列顺序`来访问元素的结构。

| 命令                  | 行为                                         |
| --------------------- | -------------------------------------------- |
| ZADD key score member | 添加一个带有给定分值的成员添加到有序集合中   |
| `ZRANGE`              | 根据元素在ZSET中所处位置，从ZSET获取多个元素 |
| ZRANGEBYSCORE         | 获取ZSET在给定分值范围内的所有元素           |
| ZREM                  | 如果给定的成员存在ZSET集合，那么移除该成员   |
| ZINCRBY               | 将键值对中指定的键的分数增加指定数值         |
| `ZSOCRE`              | 输出键值对中指定键的分数                     |
| `ZCARD`               | 返回`ZSET`中成员数量                         |
| ZCOUNT                | 返回介于[min,max]之间分值元素的数量          |
| ZRANK                 | 返回元素在`ZSET`的排名                       |

```shell
# 添加元素到ZSET中，如果member存在，会返回0，否则为1
$ ZADD zset 100 first
(integer)1
$ ZADD zset 200 second
(integer)1
# 输出键为second的分数
$ ZSCORE zset second
"200"
# 查询指定index的元素，不包括score
$ ZRANGE zset 0 -1
"first"
"second"
# 查询指定index的元素，包括score
$ ZRANGE zset 0 -1 WITHSCORES
1) "first"
2) "100"
3) "second"
4) "200"
# 获取给定分值范围[0,100]内的从0开始的1个元素
$ ZRANGEBYSCORE zset 0 100 WITHSCORES LIMIT 0 1
1) "first"
2) "100"
# 若成员们存在ZSET，那么移除该成员们
$ ZREM zset first second
(integer) 2
# 将键为first的分数增加101
$ ZINCRBY zset 101 first
"201"
```

#### 有序集合命令

| 命令               | 作用                                                         |
| ------------------ | ------------------------------------------------------------ |
| ZREVRANK           | 返回`ZSET`中member的排名，按照分值从大到小排列               |
| `ZREVRANGE`        | 返回`ZSET`给定范围内的成员，按照分值从大到小排列             |
| `ZRANGEBYSCORE`    | 返回有序集合中分值介于[min,max]的所有成员，按照分值从小到大排列 |
| ZREVRANGEBYSCORE   | 与`ZRANGEBYSCORE`顺序相反，从大到小排列                      |
| ZREMRANGEBYRANK    | 移除`排名`介于[start,stop]之间的所有成员                     |
| `ZREMRANGEBYSCORE` | 移除`分值`介于[min,max]之间的所有成员                        |
| `ZINTERSCORE`      | 对于多个`ZSET`进行`交集`运算                                 |
| `ZUNIONSTORE`      | 对于多个`ZSET`进行`并集`运算                                 |

> `ZSET`默认按照`score升序`排序。

```shell
# 定义如下zset集合
$ ZRANGE zset 0 -1 WITHSCORES	
1)  "n2"
2)  "5"
3)  "n1"
4)  "10"
5)  "n3"
6)  "15"
# 获取n3的排名
$ ZREVRANK zset n3
"0"
# 降序获取范围内元素
$ ZREVRANGE zset 0 -1 WITHSCORES
1)  "n3"
2)  "15"
3)  "n1"
4)  "10"
5)  "n2"
6)  "5"
# 返回分数在[6,10]内，index=0开始的第一个元素
$ ZRANGEBYSCORE zset 6 10 WITHSCORES LIMIT 0 1

# 定义两个ZSET集合
$ ZRANGE zset-1 0 -1 WITHSCORES
1)  "a"
2)  "1"
3)  "b"
4)  "2"
5)  "c"
6)  "3"
$ ZRANGE zset-2 0 -1 WITHSCORES
1)  "d"
2)  "0"
3)  "c"
4)  "1"
5)  "b"
6)  "4"
# 多个`ZSET`进行交集运算,取分值最大的哪个作为新的key中的score
$ ZINTERSTORE zinter 2 zset-1 zset-2 AGGREGATE MAX
"2"
# 多个`ZSET`进行并集运算,取分值综合作为新的key中的score
$ ZUNIONSTORE zunion 2 zset-1 zset-2 AGGREGATE SUM
"4"
```

---
