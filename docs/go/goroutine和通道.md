---
sort: 60
lastUpdated: "2023-11-03T20:51:29+08:00"
---
# goroutine和通道
::: warning
- goroutine是Go语言中的轻量级线程，可以并发地执行函数或方法。
- channel是goroutine之间进行通信和数据交换的管道。
- goroutine与channel用于实现`并发和协程间的通信`。
:::

## goroutine

goroutine是一种`轻量级的并发执行单元`，可与其他goroutine并行运行，相比线程，goroutine创建和切换的开销很小。通过`go`关键字来创建。使用`go`关键字启动一个函数或方法的执行时，会在一个单独的goroutine中运行该函数，与主goroutine并发执行。

```go
func test1() {
	concurrent(false)
    // 通过关键字go创建goroutine
	go concurrent(true) 
	time.Sleep(time.Second * 5)
}

func concurrent(sleep bool) {
	if sleep {
		time.Sleep(time.Second * 2)
	}
	fmt.Printf("123\n")
}
```

> 与java类似，一个程序启动的时候会有一个主goroutine，主goroutine结束时，会导致其他的goroutine也结束。

## channel

channel(通道)是一种用于在`goroutine`之间进行通信和同步的机制。通过发送操作发送数据到通道，从通道接收数据，发送和接收操作都是原子的，保证了数据的完整性和一致性。

```go
/*
一个goroutine生产数据，主goroutine读取数据
*/
func test7() {
	ch1 := make(chan int) // 创建一个类型为`chan int`的无缓存通道
	go func() {
		for x := 0; ; x++ {
			time.Sleep(time.Second)
			ch1 <- x // 发送数据到通道
			if x == 2 {
				close(ch1) // 关闭通道
			}
		}
	}()
    /*for {
		fmt.Println("waiting")
		x := <-ch1
		fmt.Println(x)
	}*/
	/*for {
		if x, ok := <-ch1; ok {
			fmt.Println(x)
		} else {
			fmt.Printf("channel close, %d\n", x)
			time.Sleep(time.Second)
			//break
		}
	}*/
	/*for {
		if x, ok := <-ch1; ok {
			fmt.Println(x)
		} else {
			fmt.Printf("channel close, %d\n", x) // 演示从关闭的通道中获取数据
			time.Sleep(time.Second)
		}
	}*/
	for x := range ch1 { // range可以循环读取通道所发送的值
		fmt.Println(x)
	}
}
```

> | 语法                   | 含义                                                     |
> | ---------------------- | -------------------------------------------------------- |
> | make(chan int)         | 创建`无缓存通道`                                         |
> | make(chan int,3)       | 创建`缓存容量为3`的通道                                  |
> | len(make(chan int, 3)) | 获取通道内此时的元素个数（0）                            |
> | cap(make(chan int, 3)) | 获取通道的缓冲区容量大小（3）                            |
> | ch1 <- x               | 发送数据到通道                                           |
> | `x := <- ch1`          | 从通道读取数据并复制给x                                  |
> | <- ch1                 | 从通道读取数据但是丢弃                                   |
> | x,ok := <- ch1         | x是从通道读取的数据，ok表示通道是否关闭（false表示关闭） |
> | for x := range ch1     | 用于循环读取通道所发送的值（阻塞等待）                   |
> | close(ch1)             | 用于关闭通道                                             |
>
> 1. `无缓存通道`上的发送操作会阻塞到另一个goroutine在对应的通道上`执行完接收操作`。同理接收方也会阻塞到另一个goroutine在对应的通道上发送一个值。
> 2. `有缓存通道`上的发送操作会在`队列的尾部`插入一个元素，接收操作会从`队列的头部`移除一个元素。若通道满了，发送方会阻塞直到有另一个goroutine读取数据，同理接收方会阻塞到另一个goroutine发送数据。
> 3. `close(ch)` 设置标志值表示已经发送完毕，向关闭后的通道发送数据会导致panic，从关闭后的通道获取数据会获取`类型的零值，且不会阻塞`。
> 4. 关闭通道不是必须的，只有在通知接收方goroutine的所有数据都发送完毕是才需要关闭通道，垃圾回收器可以根据`通道是否可以访问来决定是否回收`。
> 5. 若一个goroutine一直从`通道`中读取数据，但已经没有goroutine往`同一个通道中`发送数据，且`此通道没有关闭`，那么会出现`all goroutines are asleep - deadlock!`死锁的panic。
> 6. goroutine泄漏：对于无缓存通道，若有多个goroutine向通道发送数据，但是只接收了其中一个goroutine的数据，其他发送方发送的数据没有goroutine来接收。`泄露的goroutine不会自动回收`。

### 单向通道类型

```go
// <-chan int表示可以从通道中获取数据
func onlyReceive(ch <-chan int) {
}
// chan<- int表示可以向通道中发送数据
func onlySend(ch chan<- int) {
}
func test6() {
	ch1 := make(chan int)
	ch2 := make(chan int)
	go func(in chan<- int) {
		for x := 0; x < 10; x++ {
			in <- x
		}
		close(in)
	}(ch1) // 隐式的将chan int转为了chan<- int类型
	// 注意out和in对应的类型
	go func(out chan<- int, in <-chan int) {
		for x := range in {
			out <- x << 1
		}
		close(out)
	}(ch2, ch1)

	func(in <-chan int) {
		for x := range in {
			fmt.Println(x)
		}
	}(ch2)
}
```

> 1. `<-chan int`表示只能从通道接收数据。`chan<- int`表示只能发送数据到通道。
> 2. `onlySend(make(chan int))`程序会隐式的将`chan int`转为`<-chan int`或`chan<- int`。

## WaitGroup

`sync.WaitGroup`是go中的一种同步机制，用于等待一组goroutine的完成（使用方法与逻辑与java中的countDownLatch类似）。

```go
/*
var wg sync.WaitGroup
ch1 := make(chan int)
wg.Add(1) // Add()在函数外
go func(){
  defer wg.Done() // Done()在函数中
  // do something 
}()
go func() {
  wg.Wait()
  close(ch1)
}()
for x:= range ch1 {
  fmt.Println(x)
}
*/
func test10() {
	now := time.Now()
	var total int
	var wg sync.WaitGroup // 定义WaitGroup对象
	ch1 := make(chan int)// 定义channel
	for x := 0; x < 100; x++ {
		wg.Add(1) // 必须在goroutine外!
		go func(x int) {
			defer wg.Done() // 任务完成后通过defer调用Done（将计时器减1）
            time.Sleep(time.Second) // 模拟任务执行耗时
			ch1 <- x
		}(x)
	}
	go func() {
		wg.Wait() // 当计时器为0时wait方法会返回
		close(ch1)
	}()
	for x := range ch1 {
		total += x
	}
	fmt.Printf("time: %s, total: %d", time.Since(now), total)
}
```

> 1. WaitGroup对象的`Add(delta int)`方法用来给计数器增加值（`注意位置一定要在goroutine之前`），当任务完成时需要调用`Done()`来给计数器减1，一般配合defer延迟函数使用，`Wait()`会阻塞到计时器变为0。
> 2. 与Java中的countDownLatch使用与概念相似，即等待所有goroutine任务完成后再继续执行任务。

## select多路复用

`select`语句用在多个通道中进行选择，可以等待多个通道中的消息到达，并执行相应的操作。

```go
/*
select {
case <- ch1:
	// ...
case x := <- ch2:
	// use x
case ch3 <- y:
	// ...
default:
	// ...
}
*/
func test14() {
	start := time.Now()
	//tick := time.Tick(time.Second) // 获取定时器的只读通道
	ticker := time.NewTicker(time.Second)
	abort := make(chan struct{})
	go func() {
		_, _ = os.Stdin.Read(make([]byte, 1)) // 读取单个字节
		abort <- struct{}{}
	}()
	for countdown := 5; countdown > 0; countdown-- {
		fmt.Println(countdown)
		select { // 等待下面通道任意一个完成，若出现多个通道同时满足，那么select默认会随机选择一个
		case <-ticker.C: // 监听通道但是不做任何处理
		case <-abort: // 监听控制台输入的字节
			fmt.Println("Launch abort!")
			return
		}
	}
	ticker.Stop() // 手动关闭通道防止泄漏
	fmt.Printf("Rocket launch: %s", time.Since(start))
}

// 利用有缓存通道和select实现 打印偶数
func test13() {
	ch := make(chan int, 1) // 设置缓存为1的有缓存通道
	for i := 0; i < 10; i++ {
		select {
		case x := <-ch: // 偶数会从通道读取
			fmt.Printf("x: %d\n", x)
		case ch <- i: // 奇数循环会发送到通道
		}
	}
}
```

> 1. `time.Tick(time.Second)`此方法用于创建定时器每秒触发一次操作，返回值为定时器的只读通道。
>
> 2. select配合time.After()可以实现超时等待功能，time.After()方法会在设定的时间后返回`<- chan`
> 3. 若多个通道同时到达，select会随机选择一个，若没有任何通道准备就绪，且存在default分支，那么会执行default分支，否则select会阻塞到至少有一个通道准备就绪。
> 4. time.Tick()与time.NewTicker()都用于创建一个定时器，每隔一段时间触发一次操作。区别主要在于返回值类型，前者返回`<- chan time.Time`只读通道，后者返回`*time.Ticker`一个定时器对象。定时器如果不`显式的停止`，那么对应的goroutine仍会一直执行（导致泄漏）,所以`Tick()`仅适用于`整个生命周期都需要时`才使用，否则建议使用`NewTicker()`，并显示的调用`Stop()`来阻止泄漏。

### 并发目录遍历

```go
func test15() {
	roots := flag.Args() // ./main.exe C:/ D:/ E:/
	if len(roots) == 0 {
		roots = []string{"."}
	}
	fileSizes := make(chan int64)
	var wg sync.WaitGroup
	for _, root := range roots {
		wg.Add(1)
		go func(root string) {
			walkDir(root, &wg, fileSizes)
		}(root)
	}

	go func() {
		wg.Wait()
		close(fileSizes)
	}()

	var nfiles, nbytes int64
	for {
		select {
		case <-done:
			fmt.Println("正在中断命令...")
			for range fileSizes {
				// do nothing 用来保证正在执行的goroutine执行完毕
			}
			fmt.Println("所有goroutine执行完毕...")
			return
		case size, ok := <-fileSizes:
			if ok {
				fmt.Printf("%d files %.1f MB\n", nfiles, float64(nbytes)/1e6) // 1e6 = 1000000 1e9 = 1000000000
				nfiles++
				nbytes += size
			}
		}
	}
}

/*
递归查询目录，并计算文件大小传输到通道
*/
func walkDir(dir string, wg *sync.WaitGroup, fileSizes chan<- int64) {
	defer wg.Done()
    if cancelled() { // 查看终端通道有没有发送信号
		return
	}
	for _, entry := range recurve(dir) {
		if entry.IsDir() {
			wg.Add(1)
			subDir := filepath.Join(dir, entry.Name())
			go walkDir(subDir, wg, fileSizes) // 递归获取
		} else {
			if info, err := entry.Info(); err != nil {
				_, _ = fmt.Fprintf(os.Stderr, "du1: %v\n", err)
			} else {
				fileSizes <- info.Size()
			}
		}
	}
}

// 全局通道，上线20，用于处理goroutine数量问题
var ch1 = make(chan struct{}, 20)

/*
读取指定目录下的文件并返回
*/
func recurve(dir string) []os.DirEntry {
	defer func() {
		<-ch1 // 释放凭证
	}()
	ch1 <- struct{}{} // 获取凭证
	if entries, err := os.ReadDir(dir); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "du1: %v\n", err)
		return nil
	} else {
		return entries
	}
}

var done = make(chan struct{}) // 搭配select实现goroutine的中断

/*
判断任务有没有结束
*/
func cancelled() bool {
	select {
	case <-done:
		return true
	default:
		return false
	}
}
```

> 1. 使用`sync.WaitGroup`实现`goroutine`并发执行任务，并利用`有缓存通道`实现对`goroutine`数量的控制。
> 1.  启动单独的goroutine监听用户的输入，并使用`select`实现对通道的监听实现实施中断goroutine。
