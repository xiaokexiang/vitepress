
# HASH

`HASH`散列结构可以`无序`、`不重复`的存储多个`字符串或数值`类型的键值对。类比Java中`Map<key, HashMap<v1,v2>>`。

| 命令      | 作用                                   |
| --------- | -------------------------------------- |
| HSET      | 给指定的key关联键值对                  |
| HGET      | 获取指定的key的键值对中`指定键的值`    |
| HGETALL   | 获取指定key关联的全部键值对            |
| HDEL      | 如果键值对中存在指定键，那么移除这个键 |
| HINCRBY   | 将键值对中键的值增加指定数量           |
| HLEN      | 返回`HASH`中键值对数量                 |
| HMGET     | 批量获取一个或多个键的值               |
| HMSET     | 批量的设置一个或多个键的值             |
| `HEXISTS` | 检查指定键是否存在散列中               |
| HKEYS     | 获取散列包含的所有键                   |
| HVALS     | 获取散列包含的所有值                   |
| HGETALL   | 获取散列包含的全部键值对               |

```shell
# 给key为hash的设置键值对，如果键值对中的键存在，那么返回0，否则返回1
$ HSET hash hello world
(integer)1
$ HSET hash hello world
(integer)0
$ HSET hash ni hao
(integer)1
# 获取指定key的键值对中指定键的值
$ HGET hash hello
"world"
# 获取指定key的全部键值对
$ HGETALL hash
"hello"
"world"
"ni"
"hao"
# 若键值对中存在指定键hello和ni，那么移除它们
# 与DEL不同。后者删除全部的值
$ HDEL hash hello ni
(integer)2
$ HGETALL hash
(empty list or set)
```
