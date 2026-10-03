---
title: SV · 类型转换与 $cast
category: SystemVerilog
tags: [cast, 多态, 句柄, 运行时类型, 枚举, 静态转换]
date: 2026-10-03
order: 4
---

## 一、一句话定位

> `$cast` **不是"转换数据"，而是给同一个对象换一个更"具体"的句柄**，
> 顺便做一次运行时类型检查。

它不创建对象、不复制数据、不改变对象的实际类型。

**`$cast` 只管两件事**，本篇两块都讲：

| 主战场 | 干什么 | 在哪节 |
| --- | --- | --- |
| **类句柄** | 父类句柄 → 子类句柄（向下转型）+ 类型检查 | §二 ~ §七 |
| **整型 ↔ 枚举** | 给枚举做**成员合法性检查** | §八 |

```
对象①（实际类型 packet_eth）
   ↑                    ↑
  pkt                  eth3
（packet_base 类型）  （packet_eth 类型）
   ↑
   └─ $cast 只是加了右边这个句柄，并检查了类型是否合法
```

## 二、为什么需要 $cast

**句柄的静态类型决定你能访问哪些成员。**

```systemverilog
packet_base pkt;
packet_eth  eth;

pkt = eth;              // 合法：向上转型，父类句柄装子类对象
pkt.get_dst();          // ❌ 编译错误！packet_base 里没有 get_dst
```

编译器报错（QuestaSim 实测）：

```
** Error (vlog-13276) Could not find field/method name (get_dst) in 'pkt' of 'pkt.get_dst'.
```

`pkt` 声明成 `packet_base`，编译器在**编译期**只认父类的成员。`get_dst()` 是子类新增的，所以找不到。

要访问子类专有成员，**必须先把句柄"降级"成子类句柄** —— 这就是 `$cast`。

## 三、正确使用顺序（三步不能颠倒）

```systemverilog
packet_base pkt;
packet_eth  eth1 = new(), eth3;

// 第一步：让父类句柄指向具体对象（必须真的指向！）
pkt = eth1;

// 第二步：cast 成子类句柄，并检查返回值
if ($cast(eth3, pkt))
  // 第三步：这时才能调子类方法
  $display("dst = %h", eth3.get_dst());
else
  $display("cast 失败：对象实际类型不匹配");
```

> **顺序口诀**：先指向对象 → 再 cast 换句柄 → 最后调子类方法。
> 少了第一步（`pkt` 是 null），后两步都是空中楼阁。

## 四、$cast 的实测行为（QuestaSim 10.7c）

网上资料说法互相矛盾，以下为本机**实测结果**：

| 场景 | 返回值 | 目标句柄变化 |
| --- | --- | --- |
| 源句柄为 `null` | **1（成功！）** | 被赋为 null |
| 类型不匹配（base 对象 cast 成 child） | 0（失败） | **保持不变**，不置 null |
| 正常向下转型 | 1 | 指向同一个对象 |

```
=== TEST1: dest=null, cast 失败（类型不匹配）===
  $cast returns = 0
  after failure c = NULL

=== TEST2: dest=null, src=null ===
  $cast returns = 1          ← 居然返回成功！
  after c = NULL

=== TEST3: 正常向下转型 ===
  $cast returns = 1
  after c = non-null
```

### 两条反直觉但很实用的推论

**① 失败时目标句柄保持原值，不会变成 null**

如果你在循环里复用同一个目标句柄：

```systemverilog
foreach (items[i]) begin
  if ($cast(eth, items[i])) ...   // 假设某轮失败
  // 此时 eth 还保留着【上一轮成功时的对象】！
  eth.get_dst();                  // 不报 null，而是访问了错误的对象
end
```

这就是 UVM 里最难查的一类 bug：**不报空指针，数据静默错乱**。

**② 源为 null 时 cast 返回成功（1）**

```systemverilog
packet_eth eth3;
packet_base pkt;              // 忘了赋值，pkt 是 null
void'($cast(eth3, pkt));      // 静默"成功"，eth3 变成 null
```

不会报错、不会警告，一直等到你真正调方法才崩。

> **结论：永远检查返回值。** 不要依赖"失败后目标会变 null"来兜底。
> ```systemverilog
> if (!$cast(dst, src)) `uvm_error("CAST", "类型不匹配")
> ```

## 五、向上转型 vs 向下转型

| 方向 | 写法 | 是否合法 | 说明 |
| --- | --- | --- | --- |
| 向上（子→父） | `pkt = eth;` | ✅ 直接赋值 | 父类句柄装子类对象，天然合法 |
| 向下（父→子） | `$cast(eth, pkt);` | ⚠️ 需运行时检查 | 只有对象**实际是**该子类（或其派生类）才成功 |

**向下转型失败的典型原因**：父类句柄指向的其实是**另一个兄弟子类**的对象。

```systemverilog
pkt = crtl;                    // 指向 packet_ctrl 对象
if (!$cast(eth3, pkt))         // 失败：实际类型是 packet_ctrl，不是 packet_eth
  $display("cast FAILED");
```

## 六、常见错误

**错误 1：cast 之前忘了让父类句柄指向对象**

```systemverilog
packet_base pkt;               // 只声明，是 null
packet_eth eth3;
$cast(eth3, pkt);              // 返回 1（"成功"），但 eth3 是 null
eth3.get_dst();                // 💥 空指针
```

**错误 2：把 `$cast` 的返回值丢掉**

```systemverilog
$cast(eth3, pkt);              // ❌ 失败也不知道
if (!$cast(eth3, pkt)) ...     // ✅
```

**错误 3：试图给数据成员加 `virtual` 来绕过 cast**

```systemverilog
class packet_eth extends packet_base;
  virtual bit [47:0] dst_addr;   // ❌ virtual 不能修饰数据成员
endclass
```

`virtual` 只能修饰**方法**（让方法在运行时按对象实际类型分派）。
**数据成员不存在多态**，能访问哪些成员**只由句柄的静态类型决定**。

## 七、和 UVM 的关系

UVM 里到处都是这个套路：

```systemverilog
uvm_sequence_item item;
my_transaction    tr;

seq.get_next_item(item);              // 拿到父类型句柄
if (!$cast(tr, item))                 // 降级成具体类型
  `uvm_fatal("CAST", "类型不符")
tr.my_field = ...;                    // 才能访问具体字段
```

`$cast` 是**多态与类型安全之间的桥梁**：父类句柄负责通用流程，`$cast` 负责在需要时安全地"开箱"取出具体类型。

## 八、另一个主战场：整型 ↔ 枚举

`$cast` 的第二种用法跟类句柄完全无关：**给枚举做合法性检查**。
方向永远是 `$cast(目标, 源)`。

| 方向 | 需要 `$cast` 吗 | 实测 |
| --- | --- | --- |
| `enum → int` | ❌ **不需要**，直接赋值即可 | `cor = val` → `cor=2` |
| `int → enum` | ✅ **必须**（`$cast` 存在的核心理由） | 见 8.2 |
| `enum → 另一个 enum` | —— | `ok=1`，直接成功 |

### 8.1 enum → int：直接赋值，别多此一举

```systemverilog
typedef enum { A0 = 0, A1 = 1, A2 = 2 } e_t;
e_t val = A2;
int cor;

cor = val;          // ✅ 实测 cor = 2 —— 同族子类型，天然合法
$cast(cor, val);    // ✅ 也能过（ok=1），但纯属多余
```

> **所以 `$cast(cor, val)` 这种写法几乎不会报错**——它本来就不该报错。
> 如果你写的 `$cast` 报错了，先怀疑**方向写反了**，看 8.2。

### 8.2 int → enum：成员检查，不是范围检查

```systemverilog
cor = 1;  ok = $cast(val, cor);   // ok=1, val=1   ← 1 是枚举成员
cor = 5;  ok = $cast(val, cor);   // ok=0, val=1   ← 5 不是成员，val 保持原值
```

- 检查的是「**这个值是不是枚举成员**」，**不是**「在不在某个区间」——
  枚举值可以不连续（如 `{A = 0, B = 10}`），`$cast` 只认成员
- **失败时目标变量保持原值**，不会被写成 0 或垃圾值

**函数形式 vs 语句形式，失败行为完全不同**：

| 写法 | 越界时的表现 |
| --- | --- |
| `ok = $cast(val, cor);` | 返回 `0`，**静默**，不报错 |
| `$cast(val, cor);` | **硬报错** |

```
** Error: (vsim-3971) $cast to type 'tb_g.enum int' from 'int' failed
```

> ⚠️ **读报错的窍门**：原文格式是「**to type X from Y**」——
> X 是**目标**（第一个参数），Y 是**源**（第二个参数）。
> 看到 `from 'int'` 就说明源是 int、目标是枚举，即这一句实际是 `$cast(val, cor)`。
> **方向看反，是这类报错最大的误判来源。**

### 8.3 静态转换不做检查

```systemverilog
val = e_t'(5);      // ✅ 编译通过，实测 val = 5   ← 完全绕过成员检查
```

要**校验合法性**只能用 `$cast`；`T'(...)` 只搬位模式，不管语义。

## 九、`$cast` 的报错边界（全部实测）

| 写法 | 报错 |
| --- | --- |
| `$cast(int, val);` —— 第一个参数写成类型名 | `vlog-13069 syntax error, unexpected ','`（必须是**变量**） |
| 目标不是"单值"，如 `int carr[4]; $cast(carr, val);` | `Error: Arguments to $cast must be singular` |
| 语句形式下 int→enum 越界 | `vsim-3971 ... failed`（硬报错） |
| 类句柄用静态转换 `Child'(bh)` | `Warning (vsim-12051) Illegal assignment in cast to class Child from class Base` |

**无关类之间** cast（两个无继承关系的 class）：Questa 编译通过，但**运行时永远返回 0**。

**其他组合的实测行为**：

| 表达式 | 结果 |
| --- | --- |
| `$cast(int_v, 3.75)` | `ok=1`，`int_v = 4`（**四舍五入**，不是截断！） |
| `$cast(byte_v, 300)` | `ok=1`，`byte_v = 44`（静默按位截断） |

## 十、选型口诀：`T'(...)` 还是 `$cast`

| | `T'(expr)` 静态转换 | `$cast` |
| --- | --- | --- |
| **枚举** | **不检查**，`e_t'(5)` 直接给 5 | **检查成员**，失败返回 0 / 报错 |
| **类句柄** | **非法**（`vsim-12051`） | **唯一正确方式**，做真实类型检查 |
| 位宽收窄 | 静默截断 | 静默截断（`byte` ← 300 得 44） |
| 主要用途 | 位宽 / 进制转换、故意绕过枚举限制 | 合法性校验、句柄向下转型 |

> **口诀：要转换「位宽」用 `T'(...)`；要校验「合法性」用 `$cast`。**

## 相关笔记

- [[SV · 继承与 virtual 方法]]
- [[SV · 类与对象基础]]
- [[SV · 数据类型与位宽]]
- [[错题本 · 结构理解类]]
- [[错题本 · 代码书写类]]
