---
title: 面试题 · UVM 序列与仲裁
category: 基础面试题目
tags: [sequence, sequencer, 仲裁, lock, grab, start_item, p_sequencer, virtual_sequence]
date: 2026-10-08
---

# 面试题 · UVM 序列与仲裁

> 汇总自《UVM面试 1-65》第 17~18、24、27~48、60 题，《UVM面试题》Q10~Q13，《面试总结》11~20、35、37、49~50、59~60。

## 1. sequence 和 sequence item 有什么区别？

- **sequence item**：一个对象，建模两个验证组件之间传输的信息（事务）。例如"一次写操作的地址和数据"。基于 `uvm_sequence_item`。
- **sequence**：由 driver 驱动的、一串 sequence item 的**模式**，在 `body()` 里实现。例如"连续读取 10 次"。

## 2. `uvm_transaction` 和 `uvm_sequence_item` 有什么区别？

`uvm_transaction` 是从 `uvm_object` 派生的、用于对事务建模的基类。`uvm_sequence_item` 在它的基础上**额外加了 sequence id** 等信息。

**建议**：做基于 sequence 的激励时用 `uvm_sequence_item`，因为它自带 `sequence_id`——这是 driver 能把 response 送回正确 sequence 的前提（见第 12 题）。

## 3. `create()`、`copy()`、`clone()` 三者区别？

- **`create()`**：构造一个对象。
- **`copy()`**：把一个对象的值**复制到另一个已存在的对象**里。
- **`clone()`**：**同时完成创建和复制**。

## 4. sequence 与 item 的生命周期？

一个 sequence 包含一些有序组织起来的 item 实例。item 是基于 `uvm_object` 的，具备核心基类所必需的数据操作方法（copy、compare 等）。

item 的生命周期：**始于 sequence 的 `body()` 方法**，创建并随机化后，经由 sequencer 最终到达 driver，**被 driver 消化后生命周期结束**。

## 5. 运行 sequence 需要哪三个步骤？

```systemverilog
my_sequence_c seq;

// 1) 创建
seq = my_sequence_c::type_id::create("my_seq");
// 2) 配置或随机化
seq.randomize();
// 3) 启动（需要传一个指向 sequencer 的参数）
seq.start(m_sequencer);
```

## 6. 启动 sequence 有哪几种方式（挂载到 sequencer）？

1. **`start` 显式启动** —— 最常用。
2. **`default_sequence` 隐式启动** —— 在 testcase 里设置，sequencer 启动时自动检测。
3. **`uvm_do` 系列宏启动**。

`default_sequence` 一般在 testcase 里设置，两种写法：

```systemverilog
function void testcase0::build_phase(uvm_phase phase);
  super.build_phase(phase);
  // 写法一：直接用 type_id::get()
  uvm_config_db#(uvm_object_wrapper)::set(this, "env.agent.main_phase",
                                           "default_sequence",
                                           testcase0_sequence::type_id::get());
endfunction

function void testcase0::build_phase(uvm_phase phase);
  super.build_phase(phase);
  // 写法二：先例化再 set
  my_sequence test0_sequence;
  test0_sequence = my_sequence::type_id::create("testcase0_sequence");
  uvm_config_db#(uvm_object_wrapper)::set(this, "env.agent.main_phase",
                                           "default_sequence",
                                           test0_sequence);
endfunction
```

## 7. sequence 发送 transaction 有哪几种方式？

1. `uvm_do` 系列宏发送
2. 手动调 `start`（**要先例化**）
3. `uvm_create` + `uvm_send` 宏组合

## 8. sequence 机制包含哪几部分？优势是什么？

包含：**启动、item 的发送、仲裁机制、锁存机制、virtual sequence**。

**最大优势：把 sequence 和验证平台分离开。**

- 验证平台是相对稳定的框架；每个部分（子模块）又要有不同的测试内容。
- 如果 sequence 写在 driver 里，每启动一种测试都要改 driver 的 `main_phase` 代码 → 不可维护、不可重用。
- 把 sequence 独立出来后，按不同测试启动不同 sequence，还可以**嵌套使用**，最大程度实现不同测试用例之间的重用。

## 9. 什么是握手协议（sequence ↔ driver）？为什么要这么设计？

**sequence 端**：

1. `start_item()`：请求 sequencer 访问 driver。
2. `finish_item()`：让 driver 接收 item。这是**阻塞**调用，在 driver 调 `item_done()` 之后才返回。

**driver 端**：

1. `get_next_item(req)`：阻塞方法，直到收到 sequence item，driver 把它转成引脚级协议信号。
2. `item_done(req)`：告知 sequencer 它可以接受新请求，解除 `finish_item()` 的阻塞。

**流程**：driver 没有 item 可用时调 `get_next_item()` 尝试获取 → sequence 在 item **创建并随机化完成后**才向 sequencer 发请求 → 拿到权限后 item 经 sequencer 到达 driver → driver 提取有效数据驱动到接口 → 完成后调 `item_done()` 通知完成。

**好处**：详见上一题"sequence 机制优势"。

## 10. `start_item` 和 `finish_item` 之间能加延迟吗？

**不能，应该避免。**

```systemverilog
task body();
  seq_item_c req;
  start_item(req);
  #10 ns;                    // ✗ 错误示范
  assert(req.randomize());
  finish_item(req);
endtask
```

`start_item` 返回后，这个 sequence 就**赢得了仲裁**，可以访问 sequencer/driver。从那时到 `finish_item` 之间的任何延迟，都会让 sequencer/driver **空转被占住**，不能被其他 sequence 使用。

## 11. early randomization 和 late randomization 有什么区别？

**early**：先 `randomize()`，再 `start_item()`。

```systemverilog
task body();
  assert(req.randomize());
  start_item(req);
  // 可能因仲裁消耗时间
  finish_item(req);
endtask
```

**late**：先 `start_item()` 拿到仲裁授权，再 `randomize()`，然后发出去。

```systemverilog
task body();
  start_item(req);
  // 可能因仲裁消耗时间
  assert(req.randomize());
  finish_item(req);
endtask
```

> 实践建议：**late randomization 更常用**。因为先随机化再排队，等于随机结果在手但可能要等很久才轮到它，序列之间的随机分布会失真；late randomize 是"轮到你了，现场摇一次"，各 sequence 得到的随机分布更均匀。

## 12. driver 驱动多个 sequence 时，response 怎么送到正确的 sequence？

靠 **`sequence_id`**。sequencer 用 sequence item 里的 sequence ID 字段把 response 送回对应的 sequence。

driver 里的响应处理代码**必须调 `set_id_info()`**，把请求的 ID 复制到响应上：

```systemverilog
function drive_and_send_response();
  forever begin
    seq_item_port.get(req_item);
    drive_req(req_item);
    rsp_item = new();
    rsp_item.data = m_vif.get_data();
    rsp.set_id_info(req_item);      // ← 把 req 的 id 复制给 rsp
    rsp_port.write(rsp_item);
  end
endfunction
```

## 13. `get_next_item()` 与 `get()` 有什么区别？`try_next_item()` 呢？

| 方法 | 阻塞性 | 是否消费 item | 是否需 `item_done()` |
| --- | --- | --- | --- |
| `get()` | 阻塞 | 是 | **否**（隐式完成握手） |
| `get_next_item()` | 阻塞 | 是 | **是** |
| `try_next_item()` | 非阻塞 | 是 | 是 |
| `try_get()` | 非阻塞 | 是 | 否 |
| `peek()` | 阻塞 | **否**（只复制一份） | — |
| `put()` | 非阻塞 | — | — |

- `get()` 隐式完成握手，所以**不用显式调 `item_done()`**。
- `try_next_item()` 没有可用的 item 时返回**空指针**。
- `item_done()` 是**非阻塞**方法。

## 14. driver 里带参数和不带参数的 `item_done()` 区别？

`item_done()` 用于在 `get_next_item()` 或 `try_next_item()` 成功之后与 sequencer 完成握手。

- **不需要回响应**：调不带参数的 `item_done()`。
- **需要回响应**：把指向 response 的指针作为参数 `item_done(rsp)`。

## 15. 哪些 driver 方法是阻塞、哪些是非阻塞？

- **阻塞**：`get()`、`get_next_item()`、`peek()`
- **非阻塞**：`try_next_item()`、`item_done()`、`put()`

## 16. 下面哪段 driver 代码是错的？

```systemverilog
// ①
function get_drive_req();
  forever begin
    req = get();
    req = get();          // ✗
  end
endfunction

// ②
function get_drive_req();
  forever begin
    req = get_next_item();
    req = get_next_item();   // ✗
    item_done();
  end
endfunction

// ③
function get_drive_req();
  forever begin
    req = peek();
    req = peek();          // ✗
    item_done();
    req = get();
  end
endfunction
```

**错误点**：在调用 `item_done()` 之前**不能两次调 `get_next_item()`**，无法完成与 sequencer 的握手。

- ① 两次 `get()`：`get()` 已经隐式完成握手并消费了 item，第二次调用语义上是请求下一个还没送来的 item，逻辑错误。
- ③ `peek()` 不消费 item，所以可以多次 peek；但接着调 `item_done()` 后又调 `get()`——`item_done()` 是为 `get_next_item()` 服务的，配对错误。

## 17. sequencer 有哪些仲裁机制？哪个是默认？

5 种内置 + 1 种自定义，用 `set_arbitration()` 选择：

| 算法 | 行为 |
| --- | --- |
| `SEQ_ARB_FIFO` | **默认**。严格 FIFO，先入先出 |
| `SEQ_ARB_STRICT_FIFO` | 按优先级；优先级相同时按 FIFO |
| `SEQ_ARB_RANDOM` | 完全随机 |
| `SEQ_ARB_WEIGHTED` | 按 sequence 权重随机抽取 |
| `SEQ_ARB_STRICT_RANDOM` | 按优先级；优先级相同则随机 |
| `SEQ_ARB_USER` | 用户自定义 |

## 18. 怎么指定 sequence 的优先级？

`start()` 的第 3 个参数 `this_priority`（默认 100）：

```systemverilog
seq_1.start(m_sequencer, this, 500);   // 最高
seq_2.start(m_sequencer, this, 300);   // 次高
seq_3.start(m_sequencer, this, 100);   // 最低
```

## 19. `lock()`/`unlock()` 和 `grab()`/`ungrab()` 有什么区别？什么时候需要独占？

有些 sequence 希望**独占** sequencer 直到把 item 全部发完（比如施加一段定向激励，中途不能被打断）。

**`lock()` / `unlock()`**

- `lock` 请求和其他 sequence 的 transaction 请求**一起放进仲裁队列末尾**。
- 等到它时，前面的请求都已结束；一旦响应，sequencer 就**一直**发这个 sequence 的 transaction，直到 `unlock()`。
- **阻塞**调用，直到拿到锁才返回。
- 期间如果还有**更高优先级**的 sequence，它需要等待。

**`grab()` / `ungrab()`**

- 请求被放到仲裁队列的**最前面**，一发出就拥有 sequencer 的所有权。
- **不考虑其他 sequence 的优先级**（除非已经有人 `lock()` 或 `grab()` 了）。

## 20. `m_sequencer` 和 `p_sequencer` 有什么区别？

- **`m_sequencer`**：sequence 的**成员变量**，类型是 `uvm_sequencer_base`。sequence 一挂载到某个 sequencer 上，该 sequencer 的句柄就赋给它。
- **问题**：通过 `m_sequencer` **不能直接用**你那个具体 sequencer 子类里定义的变量（编译错误），必须先 `$cast` 向下转型。
- **`p_sequencer`**：用 `uvm_declare_p_sequencer` 宏声明的成员变量，指向你指定的 sequencer 子类型，**自动完成 cast**，因此可以自由访问该 sequencer 的成员变量。

```systemverilog
class test_sequence_c extends uvm_sequence #(req, rsp);
  `uvm_declare_p_sequencer(test_sequencer_c)   // 展开成 p_sequencer 成员 + cast

  clock_monitor_c my_clock_monitor;

  task pre_body();
    my_clock_monitor = p_sequencer.clk_monitor;   // 直接访问子类成员
  endtask
endclass

class test_sequencer_c extends uvm_sequencer #(req, rsp);
  clock_monitor_c clk_monitor;                    // 自定义成员
endclass
```

手写版等价写法（宏帮你做的就是这些）：

```systemverilog
task pre_body();
  if (!$cast(p_sequencer, m_sequencer))
    `uvm_fatal("Sequencer Type Mismatch:", " Wrong Sequencer")
  my_clock_monitor = p_sequencer.clk_monitor;
endtask
```

## 21. `pre_body()` / `post_body()` 什么情况下会被调用？

**只有通过 `start` 启动 sequence 时才调用**。用 `uvm_do` 等系列宏启动则**不会**调用。

`start()` 的可选参数 `call_pre_post`（默认 1），设为 0 时这两个函数都不调用：

```systemverilog
virtual task start(
  uvm_sequencer_base sequencer,          // 指向 sequencer 的指针
  uvm_sequence_base parent_sequencer = null,  // 父 sequence
  integer this_priority = 100,           // 在 sequencer 上的优先级
  bit call_pre_post = 1);                // 是否调用 pre_body / post_body
```

## 22. 什么是 subsequence？

从 sequence 的 `body()` 任务里调用另一个 sequence 的 `start()`，那个被调用的就是 **subsequence**。

## 23. 什么是 virtual sequence？用在哪？好处是什么？

sequence、sequencer、driver 都只针对**单个接口**，但几乎所有测试平台都需要**协调不同接口之间的激励**。virtual sequence 就是干这个的：控制多个 sequencer 中激励生成。

在子系统级 / 系统级测试平台里特别有用——让模块级的 sequence 协调地运行。

**virtual sequence 本身不发送 transaction**，只组织协调，一般只挂载到 virtual sequencer 上。

## 24. hierarchical sequence 和 virtual sequence 有什么区别？

| | hierarchical sequence | virtual sequence |
| --- | --- | --- |
| 面向 | **同一个** sequencer | **多个（不同的）** sequencer |
| 自己要挂到 sequencer 吗 | **要** | **不用** |
| 作用 | 嵌套协调底层 sequence | 顶层协调跨接口场景 |

**底层 sequence**：用来组织 item 实例。

**hierarchical sequence**：通过嵌套底层 sequence，让它们按顺序或并行挂到同一个 sequencer 上。

## 25. 什么是 virtual sequencer？和 sequencer 最大的区别？

virtual sequencer **本身不传递 item，也不需要和任何 driver 相连**。它只是**桥接所有底层 sequencer 的句柄**，是一个中心化的路由器。

## 26. sequencer 和 driver 能合并吗？

**不能。** 从重用性角度考虑：sequence 挂载、sequencer 仲裁等机制的实现都需要独立成一层，合并会严重降低验证平台复用性。

## 27. 流水线和非流水线 sequence-driver 模式有什么区别？

**非流水线**：driver 一次只驱动一个事务。sequence 发一个，driver 可能要几个周期（按接口协议）才驱动完；**只有驱动完成，driver 才接受新事务**。

```systemverilog
task run_phase(uvm_phase phase);
  req_c req;
  forever begin
    get_next_item(req);
    // 驱动到 DUT，可能要多个时钟
    item_done();          // 解除 sequence 侧 finish_item 的阻塞
  end
endtask
```

**流水线**：driver 一次驱动多个事务。每个 item 都有一个**单独的进程**去驱动，不用等上一个结束。

```systemverilog
task run_phase(uvm_phase phase);
  req_c req;
  forever begin
    get_next_item(req);
    fork
      begin
        // 驱动到 DUT，独立线程，不阻塞 sequence
      end
    join_none
    item_done();
  end
endtask
```

不需要等设计响应时，流水线模式很有用。

## 28. 怎么停止 sequencer 上所有正在运行的 sequence？

`sequencer.stop_sequences()`。

**风险**：它**不检查 driver 当前是否正在驱动任何 item**。如果 driver 这时调 `item_done()` 或 `put()`，可能出现 **Fatal Error**，因为 sequence 指针可能已经失效。

## 29. `sequence.print()` 调的是哪个方法？

建议实现 **`convert2string()`**：返回对象的字符串形式（各数据成员的值），便于把调试信息打印到仿真器界面或日志文件。

## 30. 在验证环境里，哪些地方会用到约束？

主要是 **item**：

- 数据保留位约束为 0
- 注入错误激励时约束 `error` 为 1
- 寄存器保留域约束为 0

## 相关笔记

- [[UVM · driver 与 sequence 的握手]]
- [[UVM · 序列与 sequencer]]
- [[UVM · 相位与域]] — `set_drain_time` 与 objection 的配合
- [[面试题 · factory 与配置机制]] — sequence 里用 config_db 的路径问题

## 避坑指南

- [ ] `start_item` 和 `finish_item` 之间**绝不能加延迟**
- [ ] `get()` 隐式完成握手，不用 `item_done()`；`get_next_item()` 必须配 `item_done()`
- [ ] response 回对 sequence 靠 `set_id_info()` 复制 sequence_id
- [ ] `lock()` 进仲裁队列**末尾**，`grab()` 进**最前面**
- [ ] `pre_body`/`post_body` 只有 `start` 启动才调，`uvm_do` 不调
- [ ] driver 里回响应必须 `set_id_info`，否则 response 回不到正确的 sequence