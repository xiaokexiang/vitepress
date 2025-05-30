---
sort: 15
lastUpdated: "2020-08-01T11:10:01+08:00"
---

# 二叉堆

### 概念
::: warning 概念
二叉堆本质上是一颗完全二叉树，它的根节点又叫做`堆顶`。二叉堆分为：

> 最大堆：最大堆的任何一个父节点的值，`都大于或等于`它左、右节点的值。
>
> 最小堆：最小堆的任何一个父节点的值，`都小于或等于`它左、右节点的值。

根据定义可以推导出，二叉堆的`堆顶`存放的是这棵树的`最大或最小`元素。

我们采用`数组(物理结构)`构建`二叉堆(逻辑结构)`，二叉堆的元素满足以下特性：

> 假设父节点的index为0(`记为i=0`)，那么它的左子节点index为`2n + 1`，右子节点index为`2n + 2`。
>
> 同样，如果当前节点的index=0，那么它的父节点index为`(i-1)/2 或 (i-2)/2`，取决于`i % 2 == 0`是否成立。

:::
#### 图解

![](https://fn.leejay.top:9000/images/2025/01/22/cdfbffd0-bd79-42e9-96b0-9e35d57e570e.png)

> Java中的`PriorityBlockingQueue`底层就是使用`最小二叉堆`的逻辑结构实现的。

---

#### 推导

##### 构建

对于二叉堆的构建，我们选择`最小二叉堆`推导，对于最小二叉堆构建存在两种思路：

- 我们从数组队尾开始遍历，将当前元素和它的所有父爷节点比较交换，直到当前元素的最顶层父节点。直到数组遍历完毕。

```java
// 计算当前index的父节点index
int prev(int c) {
    return c % 2 != 0 ? (c - 1) >>> 1 : (c - 2) >>> 1;
}
private int[] build(int[] array) {
    // 计算队尾节点index
    int last = array.length - 1;
    // 从队尾开始往前比较,队首不需要比较
    for (int i = last; i > 0; i--) {
        int c = i;
        int p = prev(c);
        // 如果当前节点小于父节点，那么继续循环比较
        while (array[c] < array[p]) {
            // 交换位置和index
            int temp = array[p];
            array[p] = array[c];
            array[c] = temp;
            c = p;
            p = prev(c);
            // 跳出循环的条件:parentIndex<0
            if (p < 0) {
                break;
            }
        }
    }
    return array;
}
```

> 该方法时间复杂度：我们假设数组有`n`个元素，那么一共需要判断`n-1`个元素，每个元素最多交换`logn`次(即树高度)，所以时间复杂度为：`O(nlogn)`。

- 从非叶子节点`(倒数第二层)`最后一个节点开始倒序遍历，让当前节点依次和它下面的子节点比较，最小元素作为父节点，直到堆顶。

```java
public int[] buildFast(int[] array) {
    int size;
    // 从非叶子节点开始遍历，从后往前遍历
    for (int i = (size = array.length >>> 1) - 1; i >= 0; i--) {
        int k = i;
        // 遍历查找当前index的左右节点是否都小于当前节点
        // 退出条件：当前节点的右子节点index超过数组大小
        while (k < size) {
            int le = (k << 1) + 1;
            int rt = le + 1;
            // 左右子节点比较大小
            int min = Math.min(array[le], array[rt]);
            // 如果当前节点大于子节点中的最小节点，那么需要移位
            if (array[k] > min) {
                int temp = array[k];
                array[k] = min;
                if (array[le] > array[rt]) {
                    array[rt] = temp;
                } else {
                    array[le] = temp;
                }
            }
            // 继续判断直到左右节点溢出
            k = rt;
        }
    }
    return array;
}
```

> 先说结论再证明，该方法时间复杂度：`O(n)`。
>
> - 基于第二种思路可知：`同一层`的节点的`最多交换次数是相同`的，最后一层`叶子节点`不需要执行交换，因为它的下面没有节点了。
> - 时间复杂度即为：`O(sum(交换次数)) = O(每层节点数 * 该层节点的最多交换次数)`。
> - 假设数组长度为`n`，那么树高`k = logn`，`sum()`表示为`总的交换次数`。
>   - 第一层有1个节点，第二层有2个节点，第三层有4个节点 ... 第k层有2^(k-1)个节点。
>   - 第一层节点需要交换k-1次，第二层节点需要交换k-2次...第k层需要交换0次(叶子节点)。
> ::: tip 复杂度推导
>  $sum() = 1 * (k-1) + 2 * (k-2) + ...+ 2^{k-3} * 2 + 2^{k-2} * 1 + 2^{k-1} * 0$
>
>  $sum() = 2^0 * (k-1) + 2^1 * (k-2) +...+ 2^{k-3} * 2 + 2^{k-2} * 1  ①$
>
>  $2sum() = 2^1 * (k-1) + 2^2 * (k-2) + ... + 2^{k-2} * 2 + 2^{k-1} * 1 ②$
>
>  $sum() = ② - ① = -2^0 * (k-1) + 2^1 + 2^2 + ... + 2^{k-2} * 1 + 2^{k-1} * 1$
>
>  $sum() = -k + 1 + 2 + 4 + ... + 2^{k-1}$
>
>  $sum() = 2^k - k - 1$
>
>  $sum(n) = n - log2n - 1$
> :::
> 
> 所以此方法的算法复杂度为 `O(n)`。
---

##### 添加
二叉堆的添加，都是将`元素添加到队尾`，因为此时数组已经是符合二叉堆要求的最小二叉堆，所以只需要处理新添加的元素，和新加元素的所有父节点比较替换。

```java
int[] add(int i) {
    // 我们先使用System.arraycopy复制原有数据并将新元素加入
    int size = array.length;
    int[] arr = new int[size + 1];
    System.arraycopy(array, 0, arr, 0, size);
    arr[size] = i;
    return siftUp(arr);
}
// 获取当前index的父节点index
int prev(int c) {
    return c % 2 != 0 ? (c - 1) >>> 1 : (c - 2) >>> 1;
}
/**
  * 从堆底往上替换
  * 时间复杂度： O(logn)
  *
  * @param array 默认新增元素在队尾
  * @return 添加后的最小二叉堆
  */
private int[] siftUp(int[] array) {
    // 获取新加入元素的index,即队尾
    int last = array.length - 1;
    int prev;
    // 只要父节点的index> 0，说明此时还存在父节点或爷节点
    while ((prev = prev(last)) > 0) {
        // 只要当前节点小于父节点的值，那么就交换
        if (array[last] < array[prev]) {
            int temp = array[prev];
            array[prev] = array[last];
            array[last] = temp;
        }
        // 将当前节点的index换为父节点的index，继续循环
        last = prev;
    }
    return array;
}
```

> 无论数组大小是多少，只需要处理新加入那个的节点，并且该元素最多交换`logn`次（即树高），时间复杂度为：O(1 * logn) = `O(logn)`。

---

##### 移除

因为二叉堆的特性：`堆顶是整个树最大或最小的元素`。所以移除元素都直接`移除堆顶`，然后将`队尾元素直接移到堆顶`，此时我们需要从`堆顶开始往下`比较交换。和添加不一样，添加是从`堆底往上`比较交换。

```java
/**
  * 移除队首元素，将队尾元素移到队首，再重新构建
  */
int delete() {
    int size = array.length;
    int first = array[0];
    int[] arr = new int[size - 1];
    // 将队尾移到队首
    array[0] = array[size - 1];
    System.arraycopy(array, 0, arr, 0, size - 1);
    siftDown(arr);
    return first;
}
/**
  * 从堆顶往堆底遍历，依次和左右子节点中较小的交换
  * 同样的从上往下替换，最多处理O(树高)次 -> O(logn)
  * 时间复杂度： O(logn)
  *
  * @param index 被删除的元素index
  * @return 删除后的最小二叉堆
  */
private int[] siftDown(int index, int[] array) {
    int k = index;
    int size = array.length;
    int le, rt;
     // 只要当前节点的左子节点小于size就继续循环
    while ((le = (k << 1) + 1) < size) {
        // 存在左节点没越界，但右节点越界情况
        // 此时当前节点只有一个左节点，需要当前节点和左节点比较
        if ((rt = le + 1) >= size && array[k] > array[le]) {
            int temp = array[le];
            array[le] = array[k];
            array[k] = temp;
            k = le;
        } else {
            // 此时说明左右节点都存在
            int min = Math.min(array[le], array[rt]);
            int temp = array[k];
            array[k] = min;
            // 注意这里的index要和左右子节点中较小的交换
            if (array[le] > array[rt]) {
                array[rt] = temp;
                k = rt;
            } else {
                array[le] = temp;
                k = le;
            }
        }
    }
    return array;
}
```

> 只需要处理`移到队首的原队尾元素`这一个元素，并最多交换`logn`次，所以删除的时间复杂度也是`O(logn)`。