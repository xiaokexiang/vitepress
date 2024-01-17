---
sort: 65
---
# Explain

::: tip
一条查询语句在经过MySQL查询优化器`基于成本和规则的优化`后会生成`执行计划`。执行计划可以展示具体的执行查询方式。而`EXPLAIN`可以帮助我们查询具体查询的执行计划。
```sql
# 不限于SELECT,DELETE,UPDATE,REPLACE都可以
EXPLAIN SELECT * FROM T1 WHERE id = 1;
```
:::

## 名词解释

### id

在一个查询语句中每个`SELECT`关键字都对应一个唯一的`id`。

1. 即使存在多个SELECT也可能被优化成一个。
2. 关联查询Explain排在前面的记录就是驱动表，后面的是被驱动表。
3. id为null的时候说明创建了临时表用于存放数据。

### select_type

| 类型                   | 含义                                                         |
| :--------------------- | :----------------------------------------------------------- |
| **SIMPLE**             | 查询语句中不包含`UNION`或者子查询的查询                      |
| **PRIMARY**            | 对于包含`UNION`、`UNION ALL`或者子查询的大查询来说，它是由几个小查询组成的，其中最左边的那个查询的`select_type`值就是`PRIMARY` |
| **UNION**              | 对于包含`UNION`、`UNION ALL`或者子查询的大查询来说，它是由几个小查询组成的，除了最左边的查询，其余的查询`select_type`值就是`UNION` |
| **UNION RESULT**       | MySQL`选择使用临时表来完成`UNION`查询的去重工作，针对该临时表的查询的`select_type`就是`UNION RESULT |
| **SUBQUERY**           | 如果包含子查询的查询语句不能够转为对应的`semi-join`的形式，并且该子查询是不相关子查询，并且查询优化器决定采用将该子查询物化的方案来执行该子查询时，该子查询的第一个`SELECT`关键字代表的那个查询的`select_type`就是`SUBQUERY` |
| **DEPENDENT SUBQUERY** | 如果包含子查询的查询语句不能够转为对应的`semi-join`的形式，并且该子查询是相关子查询，则该子查询的第一个`SELECT`关键字代表的那个查询的`select_type`就是`DEPENDENT SUBQUERY` |
| **DEPENDENT UNION**    | 在包含`UNION`或者`UNION ALL`的大查询中，如果各个小查询都依赖于外层查询的话，那除了最左边的那个小查询之外，其余的小查询的`select_type`的值就是`DEPENDENT UNION` |
| **DERIVED**            | 对于采用物化的方式执行的包含派生表的查询，该派生表对应的子查询的`select_type`就是`DERIVED` |
| **MATERIALIZED**       | 当查询优化器在执行包含子查询的语句时，选择将子查询物化之后与外层查询进行连接查询时，该子查询对应的`select_type`属性就是`MATERIALIZED` |

### type

对应着单表的访问方式，<a href="###单表访问方法">上文的单表访问方法</a>中介绍了一部分，但仍包含部分没有介绍。

|      访问方法       |                             释义                             |
| :-----------------: | :----------------------------------------------------------: |
|     **system**      | 当表中只有一条记录并且该表使用的存储引擎的统计数据是精确的（MyISAM） |
|      **const**      |         根据主键或者唯一二级索引列与常数进行等值匹配         |
|     **eq_ref**      | 被驱动表是通过主键或者唯一二级索引列等值匹配（联合索引全部等值匹配）的方式进行访问 |
|       **ref**       |              普通的二级索引列与常量进行等值匹配              |
|   **ref_or_null**   |      当对普通二级索引进行等值匹配查询，且同时查询null值      |
|   **index_merge**   | 使用<a href="####索引合并">索引合并</a>来执行查询，只有此类型可以使用多个索引 |
|      **range**      |                 聚簇索引或二级索引的范围查询                 |
|      **index**      |  当需要扫描全表的时候，查询的列正好包含在索引中（索引覆盖）  |
|       **ALL**       |                           全表扫描                           |
| **unique_subquery** | 类似于`eq_ref`，针对查询优化器将IN子查询转换为EXISTS，且子查询可使用主键进行等值匹配 |
| **index_subquery**  |   与`unique_subquery`类似，不过是子查询时使用的是普通索引    |

### possible_keys和key

`possible_keys`列表示在某个查询语句中，对某个表执行单表查询时可能用到的索引有哪些，`key`列表示实际用到的索引有哪些。

> 1. 使用`index`访问方法来查询某个表时，`possible_keys`列是空的，而`key`列展示的是实际使用到的索引。
> 2. `possible_keys`列中的值并不是越多越好，可能使用的索引越多，查询优化器计算查询成本会花费更长时间。

### key_len

`key_len`列表示当优化器决定使用某个索引执行查询时，该索引记录的最大长度，它是由这三个部分构成的：

- 对于使用固定长度类型的索引列来说，它实际占用的存储空间的最大长度就是该固定值
- 如果该索引列可以存储`NULL`值，则`key_len`比不可以存储`NULL`值时多1个字节。
- 对于变长字段来说，都会有2个字节的空间来存储该变长列的实际长度。

> 通过`key_len`我们可以区分某个使用联合索引的查询具体用了几个索引列。

### ref

当使用索引列等值匹配的条件去执行查询时，`ref`列展示的就是与索引列作等值匹配的对象，可能是一个常数，一个列或者一个函数。

```sql
SELECT * FROM TABLE WHERE a.id = 3; # const
SELECT * FROM TABLE_A A, TABLE_B B WHERE A.id = B.id; # TABLE_B.id
SELECT * FROM TABLE_A A, TABLE_B B WHERE A.id = UPPER(B.id); # func
```

### rows

如果查询优化器决定使用全表扫描的方式对某个表执行查询时，执行计划的`rows`列就代表预计需要扫描的行数，如果使用索引来执行查询时，执行计划的`rows`列就代表预计扫描的索引记录行数。

### filtered

`MySQL`在计算驱动表扇出时采用的一个策略：

- 如果使用的是全表扫描的方式执行的单表查询，那么计算驱动表扇出时需要估计出满足搜索条件的记录有多少条。
- 如果使用的是索引执行的单表扫描，那么计算驱动表扇出的时候需要估计出满足除使用到对应索引的搜索条件外的其他搜索条件的记录有多少条。

> rows x filerted 的值在全表扫描下就是`满足搜索条件的记录数`，在索引执行的单表扫描下就是`满足使用到的索引条件外的其他索引条件的记录数`。
>
> 在多表关联查询中，多用于计算驱动表的扇出值。

### Extra

`Extra`列是用来说明一些额外信息的

| **值**                               | **释义**                                                     |
| :----------------------------------- | :----------------------------------------------------------- |
| **No tables used**                   | 查询语句的没有`FROM`子句时                                   |
| **Impossible WHERE**                 | 查询语句的`WHERE`子句永远为`FALSE`时                         |
| **No matching min/max row**          | 当查询列表处有`MIN`或者`MAX`聚集函数，但是并没有符合`WHERE`子句中的搜索条件的记录时 |
| **Using index**                      | 查询列表以及搜索条件中只包含属于某个索引的列（索引覆盖）     |
| **Using index condition**            | 有些搜索条件中虽然出现了索引列，但却不能使用到索引           |
| **Using where**                      | 1. 使用全表扫描来执行对某个表的查询，并且语句的`WHERE`子句中有针对该表的搜索条件2. 使用索引访问来执行对某个表的查询，并且该语句的`WHERE`子句中有除了该索引包含的列之外的其他搜索条件时 |
| **Using join buffer**                | 当被驱动表不能有效的利用索引加快访问速度，会基于`块连接`来加快连接速度 |
| **Not exists**                       | 如果`WHERE`子句中包含要求被驱动表的某个列等于`NULL`值的搜索条件，而且那个列又是不允许存储`NULL`值 |
| **Using intersect/union/sort_union** | 准备使用索引合并的方式执行查询（会标出使用索引合并的索引有哪些） |
| **Zero limit**                       | 使用limit 0 时会提示该信息                                   |
| **Using filesort**                   | 使用`文件排序`对结果进行排序（数据少时内存排序 ，多时磁盘排序），当能够使用`索引排序`的时候就不会使用文件排序 |
| **Using temporary**                  | 借助临时表来完成一些功能（去重、排序 等）                    |

### Json格式查看成本

```sql
EXPLAIN FORMAT=JSON SELECT common_field FROM TABLE GROUP BY common_field;
```

```json
{
  "query_block": {
    "select_id": 1, // 查询id（一个select一个id）
    "cost_info": { // 成本
      "query_cost": "0.35"
    },
    "grouping_operation": { // group by操作
      "using_temporary_table": true, // 是否使用了临时表
      "using_filesort": false, // 是否使用了文件排序
      "table": {
        "table_name": "single_table", // 查询的表名
        "access_type": "ALL", // 查询类型
        "rows_examined_per_scan": 1, // 查询表一次大概查询多少数据 = rows
        "rows_produced_per_join": 1, // 扇出的数据量
        "filtered": "100.00", // filtered
        "cost_info": { // 成本
          "read_cost": "0.25", // IO成本 + rows*(1-filtered)成本
          "eval_cost": "0.10", // rows × filter的成本
          "prefix_cost": "0.35", // 单独查询表的成本（read_cost+eval_cost）
          "data_read_per_join": "1K" // 此次查询中需要读取的数据量
        },
        "used_columns": [ // 使用到的列 
          "id",
          "common_field"
        ]
      }
    }
  }
}
```

### Extended EXPLAIN

```sql
SHOW WARNINGS;
```

> 在执行了EXPLAIN后执行该命令，会出现`Code`和`Message`，当`Code = 1003`时，`Message`展示的是优化器重写后的查询语句（不能直接作为查询语句）。
