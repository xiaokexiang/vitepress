# STRING

可以存储`字符串`、`整数`或`浮点数`。

| 命令        | 作用                                                        |
| ----------- | ----------------------------------------------------------- |
| GET         | 获取存储在指定key的值                                       |
| SET         | 设置存储在指定key的值                                       |
| DEL         | 删除存储在指定key的值(任何类型都通用)                       |
| INCR        | 将键存储的值加1                                             |
| DECR        | 将键存储的值减1                                             |
| INCRBY      | 将键存储的值加上整数                                        |
| DECRBY      | 将键存储的值减去整数                                        |
| INCRBYFLOAT | 将键存储的值加上浮点数                                      |
| APPEND      | 将value追加到旧值后，返回追加后值长度                       |
| GETRANGE    | 获取指定闭区间的字符串                                      |
| SETRANGE    | 从某个index开始替换字符串                                   |
| GITBIT      | 将字符串转换为二进制位串，并返回位串中指定index的二进制位值 |
| SETBIT      | 将二进制串中指定index替换为指定的值                         |
| BITCOUNT    | 统计二进制串中指定区间内值为1的数量                         |
| BITOP       | 将多个二进制位串进行位运算并把结果保存在指定key中           |

```shell
$ SET hello world
"OK"
$ GET hello
"world"
# 删除指定key的value，返回删除成功的数量
$ DEL hello
"1"
# 获取key的值不存在返回null
$ GET hello
(niL)
# 将hello追加到旧值后
$ APPEND hello hello
"10"
# 获取字符串[0,4]
$ GETRANGE hello 0 4
"hello"
# 换成hello world
$ SETRANGE 5 world
"10"
```

> Redis中key`大小写敏感`，`GET HELLO` 不同于 `GET hello`。
>
> `keys *`可以查看全部的keys
