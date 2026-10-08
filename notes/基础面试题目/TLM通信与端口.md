---
title: 面试题 · TLM 通信与端口
category: 基础面试题目
tags: [TLM, port, export, imp, analysis_port, fifo, monitor, scoreboard]
date: 2026-10-08
---

# 面试题 · TLM 通信与端口

> 汇总自《UVM面试 1-65》第 12~16、25、52、54 题，《UVM面试题》Q2，《面试总结》21、39、52、54。

## 1. 什么是 TLM port 和 export？

**事务级建模（TLM）**：在较高抽象级别上对系统/模块建模，抽象掉所有底层实现细节。即使 DUT 的实际接口是信号级的，大多数验证任务（生成激励、功能检查、收集覆盖率）都能在**事务级**更好地完成。这是提高模块化和重用性的关键概念。

- **TLM port**：定义了一组用于连接的**方法（API）**。
- **TLM export**：这些方法的具体**实现**。

连接 port 与 export，就建立了两个组件之间的通信机制。producer 把事务 "put" 到 port，consumer 从 export 侧读取。

## 2. port / export / imp 有什么区别？优先级？

| 类别 | 角色 | 能连什么 |
| --- | --- | --- |
| `port` | 通信请求的**发起端** | export 或 imp |
| `export` | 介于 port 与 imp 之间的中间层 | export 或 imp |
| `imp` | 只能作为**接受请求的响应端** | 不能继续扩展连接 |

**优先级**：`port > export > imp`。只有优先级高的才能调 `connect()`。

**注意**：这三种端口**不是 `uvm_component` 的子类**，所以应该在 `build_phase` 中用 **`new()`** 创建，**不能用 `create()`**。

```systemverilog
// driver 与 sequencer 的端口连接（写在 env 的 connect_phase）
driver.seq_item_port.connect(sequencer.seq_item_export);
```

## 3. TLM 有哪些操作类型？分别是什么语义？

| 操作 | 语义 |
| --- | --- |
| `put` | A 把 transaction 发送给 B |
| `get` | A 向 B 索取一个 transaction |
| `transport` | A 发数据给 B，B 消化后返回 response，**双向** |
| `peek` | A 向 B 索取一个 transaction，B **复制一份**给 A，B 内部数据不减少 |

> `peek` 的"B 内部数据不会减少"是 FIFO 语义。

## 4. `get()` 和 `peek()` 有什么区别？

- `get()`：从 FIFO 返回一个事务（如果有），并**从 FIFO 中删除**。没有可用事务时**阻塞**等待。
- `peek()`：返回事务但**不删除**。同样是**阻塞**调用。

## 5. `get()` 和 `try_get()` 有什么区别？

- `get()`：**阻塞**。FIFO 没数据就一直等。
- `try_get()`：**非阻塞**。即使没数据也立即返回，**返回值指示是否返回了有效事务项**。

## 6. `try_*` 系列和阻塞版的对应关系

| 阻塞 | 非阻塞 | 说明 |
| --- | --- | --- |
| `get()` | `try_get()` | 取走一个 |
| `peek()` | `try_peek()` | 只看不取 |
| `get_next_item()` | `try_next_item()` | driver 侧取 |
| `put()` | `try_put()` | 放入 |

## 7. analysis port 和 TLM port 有什么区别？用在哪？

- **TLM port / TLM FIFO**：用于两个组件之间的**事务级通信**，这两个组件之间用 put/get 建立了**一对一**的通信通道。典型：**driver ↔ sequencer**。
- **analysis port / analysis FIFO**：另一种事务通道，用于组件把事务**广播**到多个组件。典型：**monitor → scoreboard / reference model**。

`analysis_port` 的特点：

- 主要用于**一对多**传输，以**广播**形式向外发送数据。
- **可以不连接**，也可以连接一个或多个 analysis imp。
- **没有阻塞/非阻塞之分**。
- 在 analysis_imp 所在的 component 里，**必须定义一个 `write` 函数**。

## 8. `uvm_tlm_analysis_fifo` 是什么？用 fifo 有什么好处？

**本质 = 一块缓存 + 两个 imp**，提供 `uvm_analysis_imp` 类型的端口与 `write()` 函数（默认深度 1）。

用它连接 monitor 与 scoreboard 的好处：

1. **scoreboard 里不用再写 `write` 函数**（由 fifo 提供）。
2. **解决 monitor 和 reference model 同时连到 scoreboard 时的处理问题**——见下一题。

## 9. scoreboard 要接收 monitor 和 model 两个来源的数据，就得定义两个 `write`，会方法名冲突，怎么解决？

两种解法：

**方法一：宏声明带后缀的端口**

```systemverilog
`uvm_analysis_imp_decl(_monitor)
`uvm_analysis_imp_decl(_model)

class scb extends uvm_component;
  uvm_analysis_imp_monitor#(item, scb) mon_port;   // → write_monitor()
  uvm_analysis_imp_model  #(item, scb) mdl_port;   // → write_model()
  // 两个 write 方法名不同，不会冲突
endclass
```

**方法二（更常用）：用 fifo**

```systemverilog
class scb extends uvm_component;
  uvm_tlm_analysis_fifo #(item) mon_fifo;   // 是 analysis_imp
  uvm_analysis_port #(item)     mon_port;   // monitor 连这里
  uvm_tlm_analysis_fifo #(item) mdl_fifo;
  uvm_analysis_port #(item)     mdl_port;

  task run_phase(uvm_phase phase);
    forever begin
      // scb 主动用 blocking_get_port 取数据，不用写 write 函数
      item i = mon_fifo.blocking_get();
      // ...
    end
  endtask
endclass
```

## 10. TLM 通信的完整步骤是什么？

1. 在组件 A 和组件 B 中**分别例化端口**；
2. 在组件 B 中**实现**对应端口的方法；
3. 在 **env** 里把 A、B 的**端口 connect 起来**。

这样 A 的 `run_phase` 里就能通过自己的端口调 B 的方法。

> 注：除了 TLM 通信，**config_db 也是一种通信方式**。

## 11. UVM 的同步机制和 SV 比有什么优势？

SV 里的同步方法只有 semaphore、event、mailbox，且都局限在**同一个对象内的各线程**。UVM 还要解决**组件之间**的线程同步。

考虑到 UVM 组件的**封闭性原则**，不推荐通过层次引用去索引公共的 event 或 semaphore。UVM 为此定义了两类对象：

**`uvm_barrier` / `uvm_barrier_pool`**

- 对多个线程同步协调。
- 可设置等待阈值：**只有不少于该阈值的进程在等待时才触发事件**，激活所有等待进程。
- 用 `uvm_barrier_pool` 全局管理这些 barrier。

**`uvm_event` / `uvm_event_pool`**

- 是对 SV `event` 的封装。
- 不同组件通过 `uvm_event_pool` **共享同一个 `uvm_event`**：`uvm_event_pool::get_global()` 拿到句柄。两个地方都调 `get_global`，先调的创建 pool，后调的只是拿句柄。
- 避免了组件之间的互相依赖。

### event vs uvm_event

| | `event` | `uvm_event` |
| --- | --- | --- |
| 触发/等待 | `->` 触发，`@` 等待 | `trigger()` 触发，`wait_trigger()` 等待 |
| 传数据 | 不能 | **可以** |
| 获取等待进程数 | 不能 | `get_num_waiters()` |
| 加回调函数 | 不能 | `add_callback()` |

## 12. driver 用非阻塞 `<=`、monitor 用阻塞 `=`，为什么？

**防止竞争冒险。** driver 驱动的是"我要发出的值"，用非阻塞避免在同一时刻和 DUT 的采样动作打架；monitor 采的是"当前实际值"，用阻塞保证采到的是稳定后的值。

## 13. mailbox、队列、fifo 有什么区别？

**mailbox vs 队列**

| | mailbox | queue |
| --- | --- | --- |
| 创建 | 必须 `new()` | 只需声明 |
| 元素类型 | 可以放不同类型（不建议） | 只能同类型 |
| 阻塞性 | `put()`/`get()` **阻塞** | `push_back()`/`pop_front()` **非阻塞**，立即返回 |
| 传参语义 | 传递并**复制 mailbox 指针** | `input` 是**值复制**，`ref` 才是指针 |

> 用 queue 取数据前应先写 `wait(queue.size() > 0)`。

**mailbox vs fifo**：fifo 内置许多端口，更方便；fifo 支持**一对多**传输，mailbox 不支持。

**fifo vs queue**：queue 可以在任意位置插入/删除；fifo 只能严格 FIFO。

## 14. `uvm_tlm_fifo` 相较于 mailbox 的优势？

1. fifo 内置了许多端口；
2. mailbox 不支持一对多通信，fifo 可以。

## 15. 打印信息的分级与控制怎么实现？

两个维度：**冗余度 verbosity** + **严重性 severity**。

**严重性**（4 级）：

| 宏 | 说明 |
| --- | --- |
| `uvm_info` | 信息，可设冗余度阈值 |
| `uvm_warning` | 警告 |
| `uvm_error` | 错误 |
| `uvm_fatal` | 致命错误 |

**冗余度**：`UVM_LOW` / `UVM_MEDIUM` / `UVM_HIGH`。设置的冗余度 **≤ 默认阈值**才显示。UVM 默认阈值是 `UVM_MEDIUM`（即默认打印 MEDIUM 和 LOW）。

改阈值：命令行 `+UVM_VERBOSITY=UVM_HIGH`，或函数 `set_report_verbosity_level(UVM_HIGH)`。

## 16. 为什么导入 `uvm_pkg` 还要单独 `` `include `` 一下 `uvm_macros.svh`？

`uvm_macros.svh` 是包含众多宏定义的头文件，把它 include 进来才能让宏定义识别成功，否则编译报错。

## 17. `parent` 机制的好处？

1. 通过 parent 可以找到它的父亲与孩子；
2. phase 机制可以通过 parent **一步一步执行**——比如 connect_phase 依靠 parent 关系由底向上逐步连接。

## 18. 为什么要避免绝对路径？怎么做？

绝对路径会大幅削弱验证平台的可移植性。做法：**用宏和接口**。

## 相关笔记

- [[UVM · TLM 通信]]
- [[UVM · 报告机制]]
- [[面试题 · UVM 序列与仲裁]] — driver/sequencer 的 `seq_item_port`
- [[面试题 · UVM 平台与组件]] — monitor 为什么独立存在

## 避坑指南

- [ ] port / export / imp **不是** `uvm_component` 子类 → 用 `new()`，不用 `create()`
- [ ] `peek` 不消费数据，`get`/`try_get` 消费
- [ ] `try_get`/`try_next_item` 非阻塞，返回值指示是否成功
- [ ] `analysis_imp` 所在组件里必须有 `write` 函数；方法名冲突用 `uvm_analysis_imp_decl` 加后缀，或改用 fifo
- [ ] `uvm_event` 和 SV `event` 的四个区别要能一口气说出来