---
title: UVM · 序列与 sequencer
category: UVM
tags: [sequence, sequencer, run_test, start, p_sequencer, sequence_library]
date: 2026-10-03
order: 3
---

> 激励从哪来、怎么送进 driver —— 这是 UVM 的核心通路。
> 本篇的流程描述直接来自本机源码 `E:\questasim\verilog_src\uvm-1.1d\src\`。

## 一、run_test() 与 test 启动

```systemverilog
module tb_top;
  initial run_test();                 // 无参数
  // 命令行： +UVM_TESTNAME=my_test
endmodule
```

源码（`base/uvm_root.svh`）行为：

1. **命令行 `+UVM_TESTNAME` 覆盖参数**（注释原文 "Command line overrides the argument"）
2. 命令行给了就用它；多个 `+UVM_TESTNAME` 只取第一个，并报 `MULTTST` 警告
3. `test_name != ""` → `factory.create_component_by_name(test_name, "", "uvm_test_top", null)`
   —— 名字固定 **`uvm_test_top`**；`$cast` 失败或返回 null → `UVM_FATAL [INVTST]`
4. `test_name == ""` 且没命令行 → **不创建任何 test**；
   若此时组件数为 0 → `UVM_FATAL [NOCOMP] "No components instantiated..."`
5. test 已存在还再调一次 → `UVM_FATAL [TTINST]`

> 结论：**必须用 `+UVM_TESTNAME` 或参数二者之一指定 test**；否则等于没 test。

## 二、sequence / sequencer / driver 的关系

```
  test
   └─ env
       └─ agent
           ├─ sequencer  ←── seq.start(this) 挂上来；sequence 产生 item
           ├─ driver     ←── forever: seq_item_port.get_next_item(req) / item_done()
           └─ monitor
```

- **sequence**：产生 transaction（激励的"剧本"），是 `uvm_object`
- **sequencer**：仲裁 + 转交，是 `uvm_component`；对 driver 暴露 `seq_item_export`
- **driver**：把 transaction 变成 pin 级信号；用 `seq_item_port.get_next_item` / `item_done` 取件

driver 侧标准写法：

```systemverilog
class chnl_driver extends uvm_driver #(chnl_trans);
  virtual task run_phase(uvm_phase phase);
    forever begin
      seq_item_port.get_next_item(req);
      do_drive(req);
      seq_item_port.item_done();
    end
  endtask
endclass
```

（`uvm_driver` 已内建 `seq_item_port`，不用自己声明。）

## 三、`seq.start()` 内部流程（源码）

调用：

```systemverilog
sub_seq.randomize();                                  // 可选
sub_seq.start(seqr, parent_seq, priority, call_pre_post);
```

**顶层 sequence（parent = null）的调用顺序**：

```
pre_start()        (task)
pre_body()         (task)  若 call_pre_post==1
body()             (task)  ← 你的激励代码
post_body()        (task)  若 call_pre_post==1
post_start()       (task)
```

**子 sequence（用 `` `uvm_do `` 系列，call_pre_post=0，parent != null）**：

```
sub_seq.pre_start()        (task)
parent_seq.pre_do(0)       (task)
parent_req.mid_do(sub_seq) (func)
body()                     (task)
parent_seq.post_do(sub_seq)(func)
sub_seq.post_start()       (task)
```

start() 内部还做了这些事（`uvm_sequence_base.svh:262` 起）：

- 优先级：`parent==null` → 默认 **100**；否则继承 parent 的优先级
- `clear_response_queue()` 清空上轮遗留的响应
- 已注册到 sequencer 时 `m_sequencer.begin_tr(this, get_name())` / `begin_child_tr(...)`
- `set_sequence_id(-1)`、清 `m_sqr_seq_ids`
- `m_sequencer.m_register_sequence(this)` 注册
- 状态机 `PRE_START → PRE_BODY → BODY → ENDED`，最后 `post_start()`

> **关键**：`` `uvm_do `` 系列宏会自动把 `call_pre_post` 设为 0，
> 所以子 sequence 的 `pre_body`/`post_body` **不会**被调用——这是常见困惑点。

## 四、m_sequencer 与 p_sequencer

| | 类型 | 来源 |
| --- | --- | --- |
| `m_sequencer` | `uvm_sequencer_base` | `uvm_sequence_base` 的成员，start 时被赋值 |
| `p_sequencer` | **具体 sequencer 类型** | 由宏生成，`$cast` 而来 |

```systemverilog
class my_seq extends uvm_sequence #(chnl_trans);
  `uvm_object_utils(my_seq)
  `uvm_declare_p_sequencer(chnl_sequencer)   // ← 声明 p_sequencer 并 cast
endclass
```

宏的真实展开（`macros/uvm_sequence_defines.svh:447`）：

```systemverilog
`define uvm_declare_p_sequencer(SEQUENCER) \
  SEQUENCER p_sequencer; \
  virtual function void m_set_p_sequencer(); \
    super.m_set_p_sequencer(); \
    if( !$cast(p_sequencer, m_sequencer)) \
        `uvm_fatal("DCLPSQ", $sformatf("%m ... Error casting p_sequencer ...")) \
  endfunction
```

- **基类句柄 `m_sequencer` 看不到子类专有成员**；要用 `p_sequencer` 才能访问
  （和 [[SV · 类型转换与 $cast]] 完全同一个道理）
- cast 在 `m_set_p_sequencer()` 里自动完成，由 start() 过程中调用
- ⚠️ 若 sequence 被挂到了**类型不对**的 sequencer 上，这里会直接 `UVM_FATAL`

## 五、start_item / finish_item 与仲裁

```systemverilog
task body();
  `uvm_create(req)              // 或 req = chnl_trans::type_id::create("req");
  req.randomize();
  start_item(req);              // ① 向 sequencer 申请"发件权"
  // 这里可以再改 req 的字段（拿到 grant 之后）
  finish_item(req);             // ② 提交，等 driver 的 item_done
endtask
```

- `start_item` → 仲裁（`wait_for_grant`），拿到权才能动 req
- `finish_item` → 把 req 交给 driver，并**阻塞到 `item_done`**
- 一个 sequencer 上可以挂多个 sequence，由仲裁器决定顺序（默认 FIFO，可设 `set_arbitration`）

## 六、uvm_sequence_library 与 RANDC 模式

`uvm_sequence_library` 是一组 sequence 的"库"，可按策略自动挑一个来跑：

| 模式 | 含义 |
| --- | --- |
| `UVM_SEQ_LIB_RAND` | 用 `select_rand` 随机挑（**可能重复**） |
| **`UVM_SEQ_LIB_RANDC`** | 用 `select_randc`，**循环随机：取遍每个 sequence 才重复** |
| `UVM_SEQ_LIB_ITEM` | 只产生 item（library 的 REQ 类型不能是基类 item，否则报 `SEQLIB/BASE_ITEM` 并回退到 RAND） |
| `UVM_SEQ_LIB_USER` | 由 `user_sequence` 字段指定的用户自定义策略 |

配置方式：

```systemverilog
uvm_sequence_library_cfg cfg;
cfg = new("seqlib_cfg", UVM_SEQ_LIB_RANDC, 1000, 2000);   // (name, mode, min_random_count, max_random_count)
my_seq_lib.selection_mode = UVM_SEQ_LIB_RANDC;
```

- `RANDC` 的价值：保证**每个 sequence 至少跑一次**，避免随机漏掉某个激励
- 与 `randc` 变量是同一套语义（循环不重复）

## 相关笔记

- [[UVM · 相位与域]]
- [[UVM · TLM 通信]]
- [[SV · 随机约束]]
- [[SV · 类型转换与 $cast]]
