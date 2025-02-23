---
sort: 15
lastUpdated: "2020-06-04T14:49:04+08:00"
---

# ThreadLocal

### 基本结构
::: tip
- ThreadLocal类，底层由`ThreadLocalMap`实现，是Thread类的成员变量，因为`类的每个实例的成员变量都是这个实例独有的`，所以在不同的Thread中有不同的副本，每个线程的副本`只能由当前线程使用，线程间互不影响`。
- 因为一个线程可以拥有多个ThreadLocal对象，所以其内部使用`ThreadLocalMap<ThreadLocal<?>, Object>`来实现。
:::

```java
public class Thread implements Runnable {
    ThreadLocal.ThreadLocalMap threadLocals = null;
}
public class ThreadLocal<T> {

	static class ThreadLocalMap {
        
        // 需要注意的是这里的Entry key是ThreadLocal的弱引用
        // 弱引用的特点是当对象没有被外部强引用引用时，下次GC弱引用对象会被清理
        static class Entry extends WeakReference<ThreadLocal<?>> {
            // value 与 ThreadLocal关联
            Object value;

            Entry(ThreadLocal<?> k, Object v) {
                super(k);
                value = v;
            }
        }
    }
}

```

![](https://fn.leejay.top:9000/images/2025/01/21/601d9b2e-c13d-488f-bda7-13b2d1187b29.png)

> 1. 当前线程执行时(`currentThread已初始化`)，会初始化ThreadLocal对象，存储在`Heap堆`中，ThreadLocal的引用，即`ThreadLocalRef`会存储在当前线程`Stack栈`中。
> 2. 当执行ThreadLocal的get()/set()方法时，会通过`当前线程的引用找到当前线程在堆中的实例`，判断这个实例的成员变量：`ThreadLocalMap`是否已经创建(即初始化)，如果没有则初始化。
> 3. 若一个Threa中存在多个ThreadLocal，那么ThreadLocalMap会存在多个Entry，`Entry的key是弱引用的ThreadLocal`。

---

### 内存泄漏触发条件

根据ThreadLocal堆栈示意图，我们可以推断处只要符合以下条件，ThreadLocal就会出现内存泄漏：

1. `ThreadLocal没有被外部强引用`，这样在GC的时候ThreadLocal会被回收，导致key = null。
2. `key = null`后没有调用过ThreadLocalMap中的get、set或remove方法中的任意一个。`(因为这些方法会将key = null的value也置为null，便于GC回收)`
3. `Thread对象没有被回收`，Thread强引用着ThreadLocalMap，这样ThreadLocalMap也不会被回收。
4. ThreadLocalMap没有被回收，但是`它的Entry中的key已被回收，key关联的value也不能被外部访问`，所以导致了内存泄漏。

总结如下：

> `Thread生命周期还没有结束，ThreadLocal对象被回收后且没有调用过get、set或remove方法就会导致内存泄漏。`

我们可以看出内存泄漏的触发条件比较苛刻的，但确实会发生，其实`只要线程Thread的生命周期结束，那么Thread的ThreadLocalMap也不会存在强引用，那么ThreadLocalMap中的value最终也会被回收。`，所以在使用ThreadLocal时，除了需要密切关注`Thread和ThreadLocal的生命周期`，还需要在每次使用完之后调用`remove`方法，这样做还有一个问题就是：

> 如果你使用的是线程池，那么会出现`线程复用`的情况，如果`不及时清理remove()会导致下次使用的值不符合预期`。

---

### ThreadLocal其他问题

- 为何key继承弱引用？

​    回答此问题需要结合上段的`ThreadLocal堆栈示意图`来解析：

1. 如果`key不继承WeakReference<T>`，此时key分别被`栈中的ThreadLocal$Ref和Entry中的key引用`，如果我们断开`栈中的ThreadLocal$Ref引用`，ThreadLocal对象仍不会被回收，因为`Entry中的key`还持有它的引用。
2. 如果`key继承了WeakReference<T>`，此时当我们通过`ThreadLocal threadLocal = null`断开栈中的引用时，`Entry中的key`持有对`ThreadLocal对象`的弱引用，根据弱引用的原理：`在下一次GC时，只持有弱引用的对象会被回收`。所以ThreadLocal对象能够成功被回收。

​    因为key继承了弱引用，所以不当操作会出现上段讨论的`内存泄漏`问题。

- 为何value不继承弱引用？

   如果我们将value也继承了弱引用，那么此时只有`Entry中持有对value的弱引用`，若在你获取value前，JVM进行过垃圾回收，那么很尴尬的事情出现了：`value被回收了!!`，所以value不能继承弱引用。

- 为何建议用static修饰ThreadLocal实例？

   在ThreadLocal类的注释中写道：

> ThreadLocal instances are typically `private static fields in classes` that wish to associate state with a thread

1. `避免每个线程都创建一个ThreadLocal对象`，即使不会导致代码错误，但是会导致内存的浪费（创建多个作用等同的相同对象）
2. 若我们将ThreadLocal对象修饰为类的静态变量，那么只要这个类不被回收，这个类就会`持有ThreadLocal的强引用`。减少因为不当操作导致**内存泄漏**的概率。