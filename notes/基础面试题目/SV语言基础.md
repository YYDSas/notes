---
title: 面试题 · SV 语言基础
category: 基础面试题目
tags: [sv, 数据类型, 数组, oop, fork_join, 事件, 约束, 接口]
date: 2026-10-08
---

# 面试题 · SV 语言基础

> 汇总自《面试总结》SV 部分第 1~39 题、《UVM面试题》第 11 题。
> 与 [[SV · 知识地图]] 互补：那篇是体系化讲解，这篇是**面试高频问法 + 简答**。

## 1. SV 的优势是什么？

支持面向对象编程、支持断言、支持更多数据类型、支持覆盖率收集，**既可以当设计语言也可以当验证语言**。

## 2. SV 的数据类型怎么分类？

**四值**：`integer`、`reg`、`logic`、`wire`、`time`
**二值**：`byte`、`int`、`longint`、`shortint`、`bit`、`real`

**有符号**：`byte`、`int`、`longint`、`shortint`、`integer`、`real`
**无符号**：`bit`、`logic`、`reg`、net 类型（如 `wire`、`tri`）、`time`

- **多驱动时用 `wire`**。
- 二值逻辑仿真器开辟的存储空间更小、行为更接近真实电路；四值逻辑因为实际过程中会出现错误，需要用 x 和 z 态来提示出错。
- 二值逻辑默认值是 `0`，四值逻辑默认值是 `x`。

## 3. `logic` 和 `wire`、`reg` 有什么区别？

引入 `logic` 的目的：方便验证人员驱动和连接硬件模块，省去考虑用 `reg` 还是 `wire` 的精力。
引入 `bit` 的目的：双状态数据类型有利于**提高仿真器性能并减少内存使用**。

`logic` 与 `reg`：**`logic` 是 `reg` 的改进**——既能过程赋值也能连续赋值，编译器可自动推断它是 reg 还是 wire。

**`logic` 只允许一个驱动，不能多重驱动**，所以 `inout` 类型端口不能定义为 `logic`。如果接了多个驱动，用 `logic` 编译时会报错。

> **结论：单驱动用 `logic`，多驱动用 `wire`。**

`wire` vs `reg`：`wire` 相当于物理连线，两端输入变化输出马上反映；`reg` 相当于存储单元，一定要触发输出才反映。`wire` 用在连续赋值 `assign`，`reg` 用在过程语句 `initial`/`always`。

## 4. 队列、定宽数组、动态数组、关联数组的区别？

**队列**：结合了链表和数组的优点，可以**在任意位置**增删元素。

常用方法：`insert`、`pop_front`、`push_back`、`delete`、`shuffle`。

**定宽数组**：静态数组，**编译时**就确定大小。分两类：

| 类型 | 写法 | 存储 |
| --- | --- | --- |
| 合并数组 | `bit[7:0] array[3:0]`（类型后、名字前） | **连续**，32 位存不满不会另开空间 |
| 非合并数组 | `bit[7:0][3:0] array`（名字后） | **不连续**，每个元素单独占一段 |

**动态数组**：内存空间在**运行时**才确定，使用前需 `new[]` 分配。

**关联数组**：针对"需要超大空间但不需要所有数据"的场景，由索引值和数据组成。

关联数组常用方法：`Num()` / `size()`（元素数目，空则返回 0）、`Delete()`（不指定索引则删所有）、`Exists()`（指定索引是否有元素，返回 0/1）、`First()` / `Last()`（取最小/最大索引，空则返回 0）。

## 5. `new()` 与 `new[]` 的区别？

`new()` 例化 class，`new[]` 例化数组。

## 6. 什么是类和对象？句柄是什么？

- **class（类）**：包含变量和方法的基本模块，是"软件"盒子。
- **object（对象）**：类的实例，"软件"例化。
- **handle（句柄）**：用来指向对象的指针，索引对象的变量和方法。

步骤：定义类 → **声明一个句柄** → `new` 创建对象（对象就是例化了的实例）。

## 7. 声明和例化的区别？

- **声明**：声明一个变量，其中保存类对象的**句柄**。
- **例化**：创建对象，为其分配内存空间，并把声明的句柄指向这段空间。

## 8. 什么是封装、继承、多态？

- **封装**：把数据和使用这些数据的方法封装成一个集合（类）。
- **继承**：通过基类得到子类，子类共享基类的属性和方法。
- **多态**：对基类方法做 `virtual` 声明，调用基类句柄指向子类对象时，会调用子类重写的方法。

**关键**：基类和子类方法同名，但能准确调用，就是多态。

> **注意**：虚方法（多态）**不影响重载**。父类无论有没有定义 `virtual`，都可以对父类进行重载。

```systemverilog
class base_packet;
  int A = 1;
  int B = 2;
  function void printA;   $display("Basepacket::A is %0d", A); endfunction
  virtual function void printB;  $display("Basepacket::B is %0d", B); endfunction
endclass

class my_packet extends base_packet;
  int A = 3;
  int B = 4;
  function void printA;  $display("My_packet::A is %0d", A); endfunction
  virtual function void printB; $display("My_packet::B is %0d", B); endfunction
endclass

base_packet p1 = new();   // A=1
my_packet   p2 = new();   // A=3, B=4
p1 = p2;                  // 向上转型，句柄指向子类对象

p1.printA;   // Basepacket::A is 1   ← 静态绑定，编译期决定
p1.printB;   // My_packet::B is 4     ← 动态绑定，virtual 生效
p2.printA;   // My_packet::A is 3
p2.printB;   // My_packet::B is 4
```

## 9. `public`、`protected`、`local` 的区别？

| 修饰符 | 本类 | 子类 | 外部 |
| --- | --- | --- | --- |
| `public` | ✓ | ✓ | ✓ |
| `protected` | ✓ | ✓ | ✗ |
| `local` | ✓ | **✗** | ✗ |

`public` 属于全局可见；`protected` 和 `local` 属于局部可见。

## 10. 隐式转换、显式转换、静态转换、动态转换？

- **隐式转换**：不需要操作符或系统函数介入的转换。例如高位宽赋值给低位宽会**截断高位**。
- **显式转换**：需要操作符或系统函数介入。分两种：
  - **静态转换**：表达式前加单引号（`int'(a)`、`unsigned'(a)`）。**不做检查**，失败也不知道。
  - **动态转换**：用 `$cast(tgt, src)`，**失败返回 0**。

## 11. `$cast` 做句柄转换：向上和向下的区别？

**向上转型**：子类句柄赋给父类句柄。**直接赋值可以**，因为父类句柄能访问的只是父类那部分界面。

**向下转型**：父类句柄赋给子类句柄。**直接赋值会报错**（编译期只查句柄类型）。

`$cast` 检查的是**对象类型**，不是句柄类型。所以：

```systemverilog
base_class bc;
sub_class  sc = new();
bc = sc;                 // ✓ 向上，直接赋值可以
$cast(bc, sc);          // ✗ 会报错：父类句柄与子类句柄指向的是不同对象

base_class bc = new();  // 父类对象
sub_class  sc1, sc2;
sc2 = new();
sc1 = bc;                // ✗ 子类句柄指向父类对象
$cast(sc1, bc);         // ✗ 也不行：bc 的真实对象是 base 不是 sub

sub_class s3 = new();
base_class bc2 = s3;    // 向上转型，父类句柄指向子类对象
$cast(s3, bc2);         // ✓ 成功
```

**总结**：当父类句柄指向**子类对象**时，可以把它 `$cast` 回子类句柄。

**为什么向下要严查**：子类比父类有更多属性，父类内存里根本没划出那些空间，硬转会内存溢出。

## 12. `$cast` 做枚举类型转换

枚举类型的缺省类型是**双状态 `int`**。可以把枚举值直接赋给 `int`（`c = color`），但 **SV 不允许不做显式转换就把 `int` 直接赋给枚举变量**——要求显式转换是为了让你意识到可能的隐式转换问题。

```systemverilog
typedef enum bit[1:0] {RED=0, BLUE=1, GREEN=2} COLOR_E;
COLOR_E color, c2;
int c;

initial begin
  color = BLUE;      // 合法值
  c = color;         // ✓ 枚举赋给 int，此时 c=1
  c = c + 1;         // c=2，越界
  if (!$cast(color, c))
    $display("cast failed for c=%0d", c);   // 会打印，c=2 越界
  c2 = COLOR_E'(c);  // 强制赋值，c2=2(GREEN)，name() 能正常打印
  $display("c2 is %0d", c2);
end
```

`COLOR_E'(c)` 是**静态转换**，越界也不报错，只是 `name()` 印不出来。

## 13. 什么是深拷贝和浅拷贝？

- **浅拷贝**：只拷贝对象中的成员变量；对象中的方法和**实例的句柄，拷贝前后共用同一内存空间**，类似引用。
- **深拷贝**：拷贝对象中所有成员变量**以及嵌套实例的内容**，并分配新的内存空间。

```systemverilog
class B; int data_b; endclass
class A;
  int i[3];      // 内嵌数组
  B  b;          // 句柄
  function new(); b = new(); endfunction
endclass
// 浅拷贝：只拷贝 i 和句柄 b
// 深拷贝：拷贝 i 和句柄 b 所指代的对象
```

`do_copy()` 不重写就是浅拷贝；要深拷贝，需要在 `do_copy()` 里显式复制嵌套对象。

## 14. `typedef` 与 `struct`

**struct** 是一组变量或常数组成的集合，可以作为整体操作。分两类：

- **填充型（packed）**：内部变量存储**串行连续**。
- **非填充型（unpacked）**：内部变量存储**并行不连续**。

`typedef` 常与 `struct` 连用，创建新类型，实现同一结构体的多次例化，提高重用性。

```systemverilog
typedef struct {
  int   weight;
  int   height;
  logic [7:0] legs;
  logic [1:0] hands;
} animal;

animal duck;   // 例化结构体，分配空间
animal dog;
duck.legs = 8'b1000_1100;
```

**class 与 struct 的区别**：

| | class | struct |
| --- | --- | --- |
| 内存 | 声明后需**例化**才构建对象 | **声明时**就开辟内存 |
| 方法 | **可以**有 | **不可以** |

## 15. `static` 与 `automatic`

| | 静态（static） | 动态（automatic） |
| --- | --- | --- |
| 变量初始化 | 声明时初始化 | `new()` 时才初始化 |
| 共享 | 可被该类**所有实例共享** | 仅本实例 |
| 生命周期 | 不随对象销毁而结束 | 跟随对象，对象销毁即结束 |
| 使用时机 | 仿真开始就创建 | **必须在对象例化后才能调用** |

**静态方法**：内部变量都是静态的，仿真开始时创建，可被多个进程和方法共享，具有全局静态生命周期。
**动态方法**：进入方法时创建动态变量，离开即销毁。

> **不能在静态方法中使用动态变量。**

`ref` 参数配在动态（`automatic`）方法上才有"外部修改可见"的效果。

## 16. 全局变量与局部变量？

- **全局变量**：伴随程序开始执行到结束一直存在，**静态生命周期**。
- **局部变量**：生命周期同其所在域共存亡（如函数/任务里的临时变量），方法调用结束后消失，**动态生命周期**。

## 17. `fork...join` 三种形式的区别？

| 形式 | 行为 |
| --- | --- |
| `fork...join` | 内部各块**并行**运行，**直到全部结束**才进入下一阶段 |
| `fork...join_any` | 内部各块并行，**任意一个**结束就进入下一阶段 |
| `fork...join_none` | 内部各块并行，**不等待**直接进入下一阶段 |

另外：

- **`wait fork`**：会阻塞调用进程，直到它的**所有子进程**结束。
- **`disable fork`**：终止**所有活跃进程**。

## 18. 三个线程同步启动，a、b 结束后就终止三个线程，怎么实现？

在 `fork...join` 里实现：a、b 两个线程结束后分别触发 `event1`、`event2`，在 `fork` **外面**等待这两个事件，两个都触发后执行 `disable fork`。

```systemverilog
initial begin
  fork
    begin ... -> event1; end
    begin ... -> event2; end
    begin ... end          // 第三个线程
  join_any               // 或 join
  wait fork;             // 等所有子进程结束
  disable fork;          // 终止所有活跃进程
end
```

## 19. task 和 function 有什么区别？

| | function | task |
| --- | --- | --- |
| 互相调用 | 能调 function，**不能调 task** | 能调 task，也能调 function |
| 执行时刻 | 总在**仿真 0 时刻**开始执行 | 可在**非零时刻**执行 |
| 时序控制 | **一定不能**含延迟、事件或时序控制语句 | 可以含 |
| 变量 | 至少一个 input，**不能有 output/inout** | 可无输入，可有多个 input/output/inout |
| 返回值 | **只返回一个值** | **不返回值**，通过 output/inout 传多个 |

## 20. 什么是 `ref`？有什么优点？

`input`/`output`/`inout` 都属于**值传递**，每次调用都会复制数据，很占内存。

**`ref` 相当于指针**——调用时引用传入的数据而不是复制。在方法内修改，**方法外也可见**（双向可见）。

若不希望方法修改传入的数据，给 ref 加 **`const`** 修饰，一旦方法内修改就报错。

> 注意：要让"方法内修改，外部可见"，方法必须是**动态的（`automatic`）**。

## 21. `break`、`continue`、`return` 的含义？

- `break`：结束整个循环。
- `continue`：立即结束**本次**循环，继续下一次。
- `return`：终止函数的执行并返回函数值（如果有）。

## 22. 什么是接口 interface？时钟块 clocking？modport？

**接口**：对信号的封装，同时连接 DUT 与验证环境。简化代码、提高重用性。

**时钟块（clocking block）**：基于时钟周期对信号进行驱动或采样，采用"**采样提前、驱动滞后**"从而消除信号竞争问题。

```systemverilog
interface chnl_intf(input clk, input rst);
  logic [31:0] ch_data;
  logic        ch_valid;
  logic        ch_ready;

  clocking drv_clk @(posedge clk);
    default input #1ns output #1ns;   // 采样提前 / 驱动滞后
    output ch_data, ch_valid;
    input  ch_ready;
  endclocking
endinterface
```

**`input #1ns` / `output #1ns` 的含义**：

- `input #1ns`：在 clk 上升沿的 **1ns 处**进行输入采样。
- `output #1ns`：在事件的 **1ns 处**进行输出驱动。

→ 所以 **monitor 先采样，driver 后驱动**。

**modport**：对接口中的信号**分组并指定方向**。有些信号是 DUT 的输入、又是环境的输出，这就是需要 modport 的原因。

```systemverilog
interface arb_if(input bit clk);
  logic [1:0] grant, request;
  logic rst;
  modport TEST    (output request, rst, input  grant, clk);
  modport DUT     (input  request, rst, clk, output grant);
  modport MONITOR (input  request, grant, rst, clk);
endinterface
```

## 23. 事件等待与触发：`@` 和 `wait()` 有什么区别？

等待：`@` 与 `wait()`。触发：`->`。

| | `wait()` | `@` |
| --- | --- | --- |
| 触发方式 | **电平敏感**（括号里为 1 就触发） | **边沿敏感**（0→1 / 1→0 才触发） |
| 等待次数 | 只等**一次** | **每时每刻都在等** |

`@` 会阻塞一个进程，直到事件被 `->` 触发才 unblock。**如果 `->event` 和 `@event` 发生在同一个 time step，就会造成竞争冒险**——因为无法确认谁先执行。

**event 的 `triggered` 属性持续一个 time slot**，因此它解决了触发和等待在同一 time step 的竞争问题：

```systemverilog
wait(event.triggered);   // 一定能等到
```

**记忆口诀**：用 `@` 搭配 `->`（即 `@` + `-`）时，**必须先 `@` 再 `->`**；用 `wait` 搭配时，谁先谁后都可以。

## 24. 什么是 time slot？

SystemVerilog 是为**离散事件执行模型**定义的语言。"离散"指仿真时间上的离散性——仿真基于时间片运行，只有连续的时钟点进行仿真。这种在仿真时间段上的离散时间片，就叫 **time slot（时间片）**。

`delta-cycle` 是仿真进程中的最小时间延迟，给组合电路的驱动添加的延迟。

两者都用于解决**同一时间点信号的竞争**问题。

### SV 调度机制

```plain
preponed（时间片入口，断定采样时间）
   ↓
active / inactive / NBA     ← module 执行层
   ↓
observed                   ← 断言检查时间
   ↓
re-active / re-inactive / re-NBA   ← program 执行层
   ↓
postponed（时间片出口）
```

## 25. `$monitor` 和 `$display` 的区别？

两者都能把观测到的信号数值显示在屏幕上。区别：

- `$display`：把信号的**当前数值**显示出来。
- `$monitor`：只有**当观测的信号数值发生变化时**才显示。

## 26. `rand` 与 `randc` 的区别？

- **`rand`**：在取值范围内随机取一个值，每次取到的**概率相同**（取完放回）。
- **`randc`**：随机一次就少一个值，**所有值都随机到后才会重复**（取完不放回）。

## 27. 约束有哪些常见写法？

**（1）权重约束 `dist`**

两种操作符：`:=n` 和 `:/n`。前者每个取值权重都是 n；后者每个取值权重为 n/取值个数。

```systemverilog
constraint addr_dist_c {
  // addr=2 占 5 份；addr=10/11/12 各占 8 份
  addr dist { 2 := 5, [10:12] := 8 };
  // addr=2 占 5 份；addr=10/11/12 各占 8/3 份
  addr dist { 2 :/5, [10:12] :/8 };
}
```

**关掉某个约束**：`constraint_mode(0)`。
**不让某个变量参与随机**：`rand_mode(0)`。

**（2）条件约束**：`if...else` 和 `->`（implication）。`->` 左边满足才触发右边。

**（3）范围约束 `inside`**：`inside {[min:max]}`。也可以直接用 `<=` `>`，但**不能连写**，`min < x <= max` 是错误的。

## 28. 约束冲突了怎么办？优先级规则？

冲突时的覆盖顺序：

1. **后约束覆盖前约束**
2. **子类型约束覆盖父类型约束**
3. **外部约束覆盖内部约束**
4. **强约束覆盖 `soft` 约束**

## 29. mailbox、event、semaphore 三种同步机制的对比？

| | mailbox | event | semaphore |
| --- | --- | --- | --- |
| 用途 | 两线程间**数据通信** | 两线程间**同步** | 多线程访问**同一资源** |
| 方法 | `put()` / `get()` / `peek()`（`try_get` 非阻塞） | `->` 触发；`@(e)` 或 `wait(e.trigger)` 等待 | `get` / `put`（`try_get` 非阻塞） |
| 阻塞 | 满了 `put()` 阻塞，空了 `get()` 阻塞 | `@` 阻塞直到触发 | key 不足时 `get` 阻塞 |
| 需 `new()` | **是** | 否 | **是** |

## 30. `` `ifndef `` / `` `define `` / `` `ifdef `` / `` `endif ``

**目的**：防止同一个文件在编译时被**重复编译**，引起多重定义问题。

```systemverilog
`ifndef APB_MASTER_DRIVER_SV
`define APB_MASTER_DRIVER_SV

class apb_master_driver extends uvm_driver;
  ...
endclass

`endif
```

含义：

- **`ifndef`** = "if not defined"：首次编译执行后续 `define`，再编译就跳过。
- **`ifdef`** = "if defined"：与 `ifndef` 相反，已编译过就继续执行。
- **`endif`**：出现 `ifndef`/`ifdef` 开头，块末尾就要用 `endif` 收尾。

两种形式：

```systemverilog
// 形式 1：没编译过才执行
`ifndef xxx
  `define xxx
  程序块
`endif

// 形式 2：编译过走程序1，否则走程序2
`ifdef xxx
  程序1
`else
  程序2
`endif
```

## 31. `` `include `` 和 `import` 的区别？

- **`include`**：把文件里所有文本**原样插入**另一个文件，等于复制。
- **`import`**：**不复制**文本内容，而是引入外部模块（包 / 类）。

`import` 更好，不占用额外内存。

> 实际区别：`` `include `` 是预处理器的文本粘贴；`import` 是编译器的命名空间引用。

## 32. `this` 和 `super` 的作用？

- `this`：一般指代**当前类**的成员变量。
- `super`：一般指代**父类**的函数（调用父类方法实现）。

## 33. SV 和 UVM 中"重载"怎么做？

- **SV**：靠面向对象特性，用**虚函数**实现子类对父类的重写（override）。
- **UVM**：通过**工厂机制**实现 override——把所有类注册到工厂中，并通过工厂创建对象。

## 34. `$random`、`$urandom`、`$urandom_range` 的区别？

- `$random()`：随机产生 **32bit 有符号**数。
- `$urandom()`：随机产生 **32bit 无符号**数。
- `$urandom_range(max, min=0)`：随机产生**指定范围内**的无符号随机整数。

## 35. 堆和栈的区别？

| | 栈 | 堆 |
| --- | --- | --- |
| 管理方式 | 操作系统自动分配释放 | 程序员控制，容易内存泄漏 |
| 大小 | 进程拥有的栈**远小于**堆 | 大 |
| 生长方向 | **向下**（地址由高到低） | **向上**（地址由低到高） |
| 分配方式 | 静态分配 + 动态分配（`alloca`） | 都是动态分配 |
| 效率 | **高**（硬件支持，专用指令） | **低**（库函数管理，易产生碎片） |
| 存内容 | 函数返回地址、参数、局部变量、寄存器内容 | 由程序员填充 |

## 相关笔记

- [[SV · 知识地图]] — 体系化讲解
- [[SV · 类与对象基础]] — 声明/例化/句柄
- [[SV · 类型转换与 $cast]] — `$cast` 详细规则
- [[SV · 数组与队列]] — 合并/非合并数组
- [[SV · 随机约束]] — `dist` 权重详解
- [[SV · 时钟与竞争]] — timeslot 与 clocking
- [[SV · 功能覆盖率]]

## 避坑指南

- [ ] 合并数组 `bit[7:0] a[3:0]` 连续存储；非合并 `bit[7:0][3:0] a` 不连续
- [ ] `$cast` 查的是**对象类型**不是句柄类型；父类句柄指向子类对象时才能 cast 回子类
- [ ] `function` 不能含时序控制、不能有 output/inout；`task` 可以
- [ ] `@` + `->` 同一 time slot 会竞争；`wait(event.triggered)` 能解决
- [ ] `@` 边沿敏感、`wait()` 电平敏感且只等一次
- [ ] `logic` 不能多驱动，`inout` 不能定义为 `logic`
- [ ] `fork...join_none` 不等待，`disable fork` 终止所有活跃进程
- [ ] 静态方法里不能用动态变量