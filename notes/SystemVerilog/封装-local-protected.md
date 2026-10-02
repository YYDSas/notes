---
title: SV · 封装 local / protected
category: SystemVerilog
tags: [封装, local, protected, 继承]
date: 2026-10-02
order: 2
---

## 一、三种访问级别

| 修饰符 | 本类方法 | 子类 | 类外部 |
| --- | --- | --- | --- |
| `local` | ✅ | ❌ | ❌ |
| `protected` | ✅ | ✅ | ❌ |
| 无（public） | ✅ | ✅ | ✅ |

一句话记忆：**`local` 是"亲儿子都不给看"，`protected` 是"亲儿子可以看"。**

```systemverilog
class cat;
  protected color_t color;   // 子类可访问，外部不可
  local bit is_good;         // 只有本类可访问
endclass
```

## 二、外部访问一律编译报错

```systemverilog
black_cat bk = new();

bk.color = WHITE;    // ❌ Illegal access to protected member color
if (bk.is_good) ...  // ❌ Illegal access to local member is_good
```

QuestaSim 的实际报错形式：

```
** Error (vlog-8688) Illegal access to protected member color.
        Full name of calling scope: outside a class context
** Error (vlog-8688) Illegal access to local member is_good.
        Full name of calling scope: outside a class context
```

## 三、子类访问 local 也会报错

```systemverilog
class bad_cat extends cat;
  function new();
    this.is_good = 1;    // ❌ local 成员子类同样无权访问
  endfunction
endclass
```

报错：

```
** Error (vlog-8688) Illegal access to local member is_good.
        Full name of member: ...::cat::is_good
        Full name of calling scope: ...::bad_cat
```

**这是 local 与 protected 的本质分界线**：protected 允许子类，local 连子类都拒绝。

## 四、时钟类典型题

```systemverilog
class clock;
  local bit is_summer = 0;
  local int nclock = 6;

  function int get_clock();
    if (!is_summer) return this.nclock;
    else            return this.nclock + 1;
  endfunction

  function void set_summer(bit s);
    this.is_summer = s;
  endfunction
endclass
```

```systemverilog
clock ck = new();
ck.get_clock();        // → 6   （is_summer=0）
ck.set_summer(1);      // ✅ 合法：set_summer 是 public
ck.get_clock();        // → 7   （走 else 分支，6+1）

ck.nclock;             // ❌ 报错！nclock 是 local，外部不可访问
```

| 表达式 | 结果 | 原因 |
| --- | --- | --- |
| `ck.get_clock()` 第一次 | 6 | `is_summer=0`，返回 nclock |
| `ck.nclock` | **编译报错** | local 成员外部不可访问 |
| `ck.get_clock()` 第二次 | 7 | 已调用 set_summer(1) |

> **陷阱**：`set_summer` 调用本身合法，确实把 `is_summer` 改成了 1。但题目若让你**直接访问 `ck.nclock`**，就撞上了 local 的限制——这是考点。

## 五、为什么需要封装

1. **隐藏实现细节**：外部只能通过 `get_clock()` / `set_summer()` 交互，不能乱改内部状态
2. **可维护**：内部算法改了（如夏天+1改+2），外部调用代码不用动
3. **防误用**：避免外部代码绕过校验直接写字段

## 相关笔记

- [[SV · 类与对象基础]]
- [[SV · 继承与 virtual 方法]]
