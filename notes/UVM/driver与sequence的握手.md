---
title: UVM · driver 与 sequence 的握手
category: UVM
tags: [get_next_item, item_done, start_item, finish_item, peek, REQ, 阻塞, 握手]
date: 2026-10-06
order: 6
---

> [[UVM · 序列与 sequencer]] 讲的是"sequence 怎么被启动、怎么被仲裁"；
> 本篇只讲**一次 item 的交接**：谁在哪一行卡住、被谁放行、数据怎么走。
>
> 源码引用均来自本机 `E:\questasim\verilog_src\uvm-1.1d\src\`。
> 先看「明面路线」（自己写的代码），再看「底层为什么」。

## 一、明面上只有 4 个地方会阻塞

以 `drv_seq_demo.sv` 为例，你自己写的代码只有两块：`seq_manual::body` 和 `drv::run_phase`。

```systemverilog
// sequence 侧                              driver 侧
repeat(4) begin                             forever begin
  req = item::type_id::create("req");         seq_item_port.get_next_item(req);  // ⛔ ④
  start_item(req);            // ⛔ ①         #10;
  if (!req.randomize()) ...                    // ... 驱动 DUT ...
  finish_item(req);           // ⛔ ②         seq_item_port.item_done(rsp);      // 解除 ②③
  if (data 偶数) get_response(rsp);  // ⛔ ③ end
end
```

| | 写在哪 | 谁卡住 | 卡到什么时候才放行 |
| --- | --- | --- | --- |
| **①** | `start_item(req)` | sequence | 等 driver 的 `get_next_item(req)` 来认领 |
| **②** | `finish_item(req)` | sequence | 等 driver 调 `item_done()` 或 `item_done(rsp)` |
| **③** | `get_response(got)` | sequence | 等 driver 的 `item_done(rsp)`（driver 不回 → **永远卡**） |
| **④** | `get_next_item(req)` | driver | 等 sequence 的 `finish_item(req)` 把件送上来 |

**除这 4 行以外，你写的每一行都是零时间走过去的。**

## 二、一件 item 的交接，就 4 拍

```
第 1 拍   [SEQ] start_item(req)  停住
          [DRV] get_next_item      认领        →  ① 解开
第 2 拍   [SEQ] randomize + finish_item  送件
          [DRV] get_next_item      返回       →  ④ 解开
第 3 拍   [DRV] #10 → item_done(rsp)         →  ②③ 解开
第 4 拍   两边各自回到循环头，开始下一件
```

两边是**独立进程**，靠这 4 行互相踩刹车 —— 所以日志里 `[DRV]` 与 `[SEQ]` 的时间戳一定是**交错**出现的，不可能各跑各的。

## 三、核心机制：`get_next_item` 只 peek，`item_done` 才弹

这是理解全部行为的那把钥匙。

```systemverilog
// seq/uvm_sequencer.svh:170
task uvm_sequencer::get_next_item(output REQ t);
  if (get_next_item_called == 1)                       // 防呆：上次没交差就再取
    uvm_report_error(get_full_name(),
      "Get_next_item called twice without item_done or get in between", UVM_NONE);
  if (!sequence_item_requested) m_select_sequence();   // ① 等一个 sequence 来排队
  sequence_item_requested = 1;
  get_next_item_called    = 1;
  m_req_fifo.peek(t);                                  // ② ★ 只看，不弹出
endtask

// seq/uvm_sequencer.svh:241
function void uvm_sequencer::item_done(RSP item = null);
  sequence_item_requested = 0;                         // 解锁，允许下一次取
  get_next_item_called    = 0;
  if (m_req_fifo.try_get(t) == 0)                      // ★ 这里才真正弹出
    uvm_report_fatal(get_full_name(), {"Item_done() called with no outstanding requests.",
      " Each call to item_done() must be paired with a previous call to get_next_item()."});
  else begin
    m_wait_for_item_sequence_id    = t.get_sequence_id();      // 唤醒 sequence
    m_wait_for_item_transaction_id = t.get_transaction_id();
  end
  if (item != null) seq_item_export.put_response(item);        // 有 rsp 才回信
  grant_queued_locks();
endfunction
```

**`get_next_item` 用 `peek`（只读不取），`item_done` 用 `try_get`（真正弹出）—— 它是一个 peek/get 对，不是一个函数干一半。**

顺带对比 `get()`（`uvm_sequencer.svh:276`）：

```systemverilog
task uvm_sequencer::get(output REQ t);
  if (sequence_item_requested == 0) m_select_sequence();
  sequence_item_requested = 1;
  m_req_fifo.peek(t);
  item_done();          // ★ get = get_next_item + item_done，一步到位
endtask
```

⚠️ 所以**用了 `get()` 就不要再写 `item_done()`**，否则那句 `try_get` 会失败 → `UVM_FATAL [SQRPUT] Item_done() called with no outstanding requests`。

| 方法 | 阻塞? | 自动 item_done? | 备注 |
| --- | --- | --- | --- |
| `get_next_item` | 是 | 否 | 取件后必须手动交差 |
| `try_next_item` | 否（没件返 null） | 否 | 非阻塞版 |
| `peek` | 是 | 否 | 可反复看同一个 item |
| `get` | 是 | **是** | 与 `item_done` 互斥 |

## 四、`start_item` / `finish_item` 的参数语义

签名（`seq/uvm_sequence_base.svh:737 / :791`）：

```systemverilog
virtual task start_item (uvm_sequence_item item,
                         int set_priority = -1,
                         uvm_sequencer_base sequencer = null);
virtual task finish_item (uvm_sequence_item item,
                          int set_priority = -1);
```

**`item` 没有默认值，必填** —— `start_item()` 空括号直接编译报错。能省的只有后两个参数。
`start_item(req)` 完全等价于 `start_item(req, -1, null)`。

内部各自做了什么：

| 函数 | 内部步骤 | 阻塞点 |
| --- | --- | --- |
| `start_item` | `item.set_item_context(this, sequencer)` → `wait_for_grant` → `begin_child_tr` → `pre_do(1)` | **等批准** |
| `finish_item` | `item.get_sequencer()` → `mid_do(item)` → `send_request(this, item)` → `wait_for_item_done(this,-1)` → `post_do(item)` | **等 `item_done`** |

**`item` 这个实参在链路上承担四个身份**：

1. **决定发到哪个 sequencer** —— `sequencer == null` 时就从 `item.get_sequencer()` 取
2. **决定回信回给谁** —— `set_item_context` 把 item 与发起它的 sequence 绑在一起，之后 `put_response` 靠 item 上的 **sequence_id** 找回原 sequence
3. **它就是最终被 driver 取走的那件东西** —— `send_request` 把 `item` 直接 `try_put` 进 `m_req_fifo`，driver 的 `get_next_item` peek 到的**就是这个对象（同一个句柄，不是副本）**
4. **它是 `finish_item` 找 sequencer 的唯一线索** —— 所以 start/finish **必须传同一个 `req`**，传两个不同对象会得到 `UVM_FATAL "STRITM sequence_item has null sequencer"`

> 这也是 `[SQRPUT] Driver put a response with null sequence_id` 的由来：
> `rsp` 没有 `set_id_info(req)`，就等于信封上没有收件人地址。

### 为什么 `randomize()` 夹在中间

```systemverilog
start_item(req);                                    // 排队等批准
if (!req.randomize()) `uvm_error("SEQ", "randomize failed")   // ★ 拿到批准后再随
finish_item(req);                                   // 发货，等签收
```

1. **晚生成**：`start_item` 返回时仲裁权才刚交给你，此刻状态最新；早随了就是拿旧状态做决策
2. **零时间**：官方注释要求 *"finish_item must be called after start_item with no delays or delta-cycles"* —— `randomize` 零时间合规，`#10` 不行

### 一个防呆彩蛋

```systemverilog
if($cast(seq, item))
  uvm_report_fatal("SEQNOTITM", "attempting to start a sequence using start_item() ... Use seq.start() instead.");
```

因为 `uvm_sequence` 本身就继承自 `uvm_sequence_item`，类型上能把 sequence 传进 `start_item`，编译器不拦。UVM 用一次 `$cast` 在**运行期**把这种"类型对但语义错"的误用抓出来。

## 五、为什么是 `output REQ`（应用者最容易懵的一处）

```systemverilog
task get_next_item(output REQ t);
//                 └方向┘└类型┘└名字┘
```

- **为什么用 output 而不用 return**：`get_next_item` 是**会阻塞的 task**，而 SV 里 **task 没有返回值**，只能靠 `output` 参数把结果带出来。对比 `uvm_sequencer_param_base::get_current_item()` —— 那个不阻塞，写成 function，就 `return t;`
- **`REQ` 是类参数（类型参数）**，不是具体类型。`uvm_driver #(chnl_trans)` 里 `REQ = chnl_trans`，所以**文档里的 "REQ item" = "一个 REQ 类型的请求对象"**
- **括号里的 `req` 是实参，对应的是形参"名字位"**，不是"类型位"。它是你提供的**接收容器**，类型必须能接住 `REQ`；变量叫什么名字无所谓
- **`output` 的复制发生在返回时** —— 所以 driver 卡在 `get_next_item` 期间，`req` 里还是旧值（或 null），排查挂死时别看它

## 六、实测：忘写 `item_done()` 会怎样

把 `get_next_item` 和 `item_done` 配对的规律破坏掉，不是"少做一步"，而是**仿真永远跑不完**（20s 超时退出码 124）：

| 观测项 | 结果 |
| --- | --- |
| sequence 打印 | **只有 1 次**（卡在 `finish_item` 里出不来） |
| driver 打印 | **43504 次，每次都是同一件 item**（peek 从不弹出） |
| `Get_next_item called twice without item_done or get in between` | 报 **21752 次** |
| 仿真时间 | 仍在走（driver 的 `#10` 在跑），只是 `run -all` 永不结束 |

关键认知：**driver 侧不是静止的，它在空转同一件 item**；真正停摆的是 sequence。

## 七、避坑指南

- [ ] `get_next_item` ↔ `item_done` **一对一配对**；改用 `get()` 就不要再写 `item_done`
- [ ] 带 response 必须先 `rsp.set_id_info(req)`，且 `rsp` 应由 `req.clone()` 得到（不是凭空 `new`）
- [ ] `start_item` / `finish_item` **必须传同一个 req**
- [ ] `randomize()` 只能在 `start_item` 之后、`finish_item` 之前，且中间**不能有延时**
- [ ] **peek 返回的是句柄不是副本** —— 在 driver 里改 `req.xxx` 会改到 sequence 手里同一个对象；要改就 `clone()`
- [ ] response 队列默认深度 8（`uvm_sequence_base.svh:963`），溢出会**报错并丢弃**
- [ ] "driver 卡在 `get_next_item`" 十有八九是 sequence 没 `start(sequencer)`、或忘了 objection
- [ ] 排查手段：在 `forever` 内外两侧打 **`$display` 时间戳**（标签用纯 ASCII）

## 相关笔记

- [[UVM · 序列与 sequencer]]
- [[UVM · TLM 通信]]
- [[SV · 类型转换与 $cast]]
- [[错题本 · 静默失败类]]
