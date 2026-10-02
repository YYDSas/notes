---
title: SV · 继承与 virtual 方法
category: SystemVerilog
tags: [继承, virtual, clone, cast, super]
date: 2026-10-02
order: 3
---

## 一、virtual 的意义

`virtual` 让方法调用**在运行时按对象的实际类型分派**，而不是按句柄的静态类型。

```systemverilog
class trans;
  virtual function trans clone(trans t = null);
    if (t == null) t = new();
    t.pkt_id = pkt_id;          // 拷贝源对象的数据到目标
    ...
    return t;
  endfunction
endclass

class chnl_trans extends trans;
  int ch_id;
  virtual function trans clone(trans t = null);
    chnl_trans ct;
    if (t == null) ct = new();
    else void'($cast(ct, t));
    void'(super.clone(ct));     // 调用父类版本填公共字段
    ct.ch_id = ch_id;           // 补子类专有字段
    return ct;
  endfunction
endclass
```

```systemverilog
trans t1;
chnl_trans ct1 = new();
t1 = ct1;                 // 父类句柄指向子类对象
trans t2 = t1.clone();    // ✅ 调用的是 chnl_trans::clone（virtual 分派）
```

**如果没有 `virtual`**，`t1.clone()` 会调用 `trans::clone`，只复制父类字段，`ch_id` 丢失。

## 二、clone 的执行路径（关键理解）

```systemverilog
t2 = t1.clone();
```

```
t2 = t1.clone()
      │ virtual 分派 → chnl_trans::clone()
      ▼
  chnl_trans::clone(t = null)
      ├─ t == null ? 是 → ct = new()          【造出新对象②】
      ├─ super.clone(ct)                       【进入父类版本，形参 t = ct】
      │     ├─ t == null ? 否 → 不 new
      │     ├─ t.pkt_id = pkt_id     ← 对象①的 pkt_id → 对象②
      │     └─ return t               【返回对象②】
      ├─ ct.ch_id = ch_id             ← 对象①的 ch_id → 对象②
      └─ return ct                     【返回对象②】
```

**三个极易混淆的点**：

1. **`super` 是"父类版本的方法"，不是句柄**
   `super.clone(ct)` = 调用父类里的 clone 实现，跟某个对象句柄无关。

2. **父类 clone 里不带 `this.` 的成员，属于"调用者对象"**
   ```systemverilog
   t.pkt_id = pkt_id;
   //         ^^^^^^ 这个是【源对象 ct1】的 pkt_id
   //  ^^^^^^ 这个是【目标对象 ct】的 pkt_id
   ```
   语义是「用源对象的数据填充目标对象」，方向是 **ct1 → 新对象**。

3. **进入子类 clone 时 `t` 是 null**
   因为 `t1.clone()` 没传参数，用了默认值 `null`，所以走 `ct = new()` 分支。

## 三、$cast 的作用

```systemverilog
void'($cast(ct2, t2));
```

`$cast` 做两件事：
- **运行时类型检查**：检查 t2 指向的对象实际类型是否为 chnl_trans 兼容
- **给同一个对象再加一个句柄**：ct2 也指向那个对象

**它不创建对象、不复制数据。**

| 位置 | 目的 |
| --- | --- |
| `$cast(ct, t)` | 子类 clone 内，把外部传入的父类句柄转成子类句柄 |
| `$cast(ct2, t2)` | 把 clone 返回的父类句柄转成子类句柄，才能访问 ch_id |

### 为什么不能直接 `t2.ch_id`

`t2` 的静态类型是 `trans`，编译器只认父类成员，`ch_id` 是子类新增的 → **编译报错**。

> **重要**：给 `ch_id` 加 `virtual` **也没用**。`virtual` 只能修饰**方法**，不能修饰数据成员。数据成员不存在多态，访问范围只由**句柄的静态类型**决定。

## 四、对象计数实例

```systemverilog
chnl_trans t1, t2, t3;
static int global_obj_id = 0;
function new(); global_obj_id++; obj_id = global_obj_id; endfunction

t1 = new();          // 对象①，obj_id = 1
t2 = t1;             // 句柄复制，不产生新对象
t3 = t1.clone();     // clone 内部 new()，对象②，obj_id = 2
```

仿真结果：

```
t1 object ID is [1]
t2 object ID is [1]    ← 与 t1 同一个对象
t3 object ID is [2]    ← clone 出的新对象
global_obj_id = [2]    ← new() 共调用 2 次
```

| 句柄 | 指向 | obj_id |
| --- | --- | --- |
| t1 | 对象① | 1 |
| t2 | 对象① | 1 |
| t3 | 对象② | 2 |

## 五、clone 是浅拷贝

```systemverilog
c.data = this.data;    // data 是动态数组 → 赋的是【句柄】
```

新对象和源对象**共享同一块数组内存**。要真正深拷贝：

```systemverilog
c.data = new[this.data.size()](this.data);
```

## 相关笔记

- [[SV · 类与对象基础]]
- [[SV · 封装 local-protected]]
