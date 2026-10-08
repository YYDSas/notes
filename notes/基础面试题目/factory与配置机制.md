---
title: 面试题 · factory 与配置机制
category: 基础面试题目
tags: [factory, override, config_db, resource_db, field_automation, create]
date: 2026-10-08
---

# 面试题 · factory 与配置机制

> 汇总自《UVM面试题》Q3/Q6/Q7/Q9/Q10、《IC验证面试之UVM》Q1、《面试总结》1~4/46~48/57/61。

## 1. UVM 的 factory 机制是什么？优点是什么？

factory 是一种**设计模式**。使用时分三步：

1. **注册**：定义类时用 `uvm_component_utils` / `uvm_object_utils` 把类注册进 factory 表。
2. **实例化**：用静态方法 `type_id::create()` 创建对象，**不能直接 `new()`**。
3. **重载 override**：写一个派生类替换原对象。

**优点**：在**不修改平台代码**的前提下替换实例或已注册类型，让配置更灵活。

内部有两张表：**注册表** 和 **替换表**。实例化时若替换表无内容，用注册表的类；否则用替换表的内容。

## 2. factory 覆盖（override）成立的 3 个条件？

这题问的是"怎样才能确保可以正确覆盖"：

1. 原始类和覆盖类**都必须在 factory 注册**；原始类必须通过 `type::type_id::create()` 实例化（不是 `new()`）。
2. 覆盖方法必须在**原始类对象创建之前**被调用。
3. 覆盖类必须是原始类的**子类**，且被调用的方法在原始类里声明为 `virtual`（否则句柄类型转换会出错）。

> 原文补充：**覆盖类为原始类的父类时会报错。**

派生关系方向记牢：**子类覆盖父类**，不能反过来。

## 3. `type override` 和 `instance override` 有什么区别？

- **type override**：对该组件**类型**所在层次结构中的**所有实例**生效。
- **instance override**：只覆盖该组件层次结构中的**那一个特定实例**。

因为只有 UVM **component** 类才有层次结构，所以**只有 component 类能做 instance override**；sequence（属于 object）只能做 type override。

## 4. `uvm_component_utils` / `uvm_object_utils` 宏的作用是什么？

把派生自 `uvm_component` / `uvm_object` 的类**注册到工厂**中。这样工厂就能：根据字符串自动创建类实例、调用其中的函数与任务；然后这个类的 `main_phase` 会被自动调用（因为 `main_phase` 本身是一个任务）。

```systemverilog
class test_seq_c extends uvm_sequence #(req, rsp);
  `uvm_object_utils(test_seq_c)          // object 用这个
endclass

class test_driver_c extends uvm_component;
  `uvm_component_utils(test_driver_c)    // component 用这个
endclass
```

**为什么要注册**：factory 是 UVM 里一张特殊的查找表。不注册就不能用 `::type_id::create()` 构造。

## 5. `new()` 和 `create()` 有什么区别？

两者都分配内存，但 **`create()` 内部会查 factory**，允许在重载时把对象替换成另一个类的实例，而无需改代码。

UVM 推荐用 `::type_id::create()` 而不是 `new()`。

> 相关：`overload` 是方法重载（同名字、参数列表不同的多个方法）；`override` 是方法重写（子类重新声明同名同参同返回值的成员方法）。

## 6. `field_automation` 机制是什么？

用 `uvm_field_*` 系列宏注册成员变量之后，可以直接调用 UVM 内置的 `copy`、`compare`、`print`、`pack` 等方法，不用自己写。

```systemverilog
class item extends uvm_sequence_item;
  rand bit [7:0] addr;
  rand bit [31:0] data;
  `uvm_object_utils_begin(item)
    `uvm_field_int(addr, UVM_DEFAULT)
    `uvm_field_int(data, UVM_DEFAULT)
  `uvm_object_utils_end
endclass
```

> ★ **坑（本机实测）**：`super.build_phase()` 里的 `apply_config_settings()` **只对 `uvm_field_*` 注册过的字段生效**。没注册的字段，`config_db` 拿不到。

## 7. `uvm_config_db` 的作用是什么？set/get 四个参数分别是什么？

**作用**：在验证平台组件之间共享配置参数。任何组件都能 `set`，任何组件都能 `get`，**不需要知道对方在层次结构中的确切位置**。

`config_db` 主要传三类东西：

1. **virtual interface** —— 让 driver / monitor 与 DUT 连上。
2. **单一常量值** —— int、string、enum 等。
3. **配置对象（config object）** —— 参数多时封装成一个 object 类，不易出错。

```systemverilog
// 4 个参数：cntxt, inst_name, field_name, value
uvm_config_db#(T)::set(uvm_component cntxt, string inst_name, string field_name, T value);
uvm_config_db#(T)::get(uvm_component cntxt, string inst_name, string field_name, ref T value);
```

- `set` 的第 1 个参数：**发送** component 实例的指针
- `get` 的第 1 个参数：**接收** component 实例的指针
- 第 2 个参数：相对该实例的目标组件路径
- 第 3 个参数：目标组件中的成员变量名（记号）
- 第 4 个参数：要设置/取得的值

## 8. 用 `config_db` 传参不成功可能是什么原因？

最常见两个：

1. `set` 和 `get` 的**路径不一致**（`inst_name` 拼接出来的作用域不匹配）。
2. 第 3 个参数**成员记号不一致**（字段名拼错、大小写不同）。

补充：类型模板参数不一致也算——`uvm_config_db` 取用时先匹配作用域正则，再比较 `get_type_handle()`，**模板参数不同就是不同类型**，会 get 不到。

## 9. `uvm_config_db` 和 `uvm_resource_db` 有什么区别？

`uvm_config_db` 继承自 `uvm_resource_db`。

**`uvm_resource_db`**：对同一配置**后写入有效**，与层次关系无关。build_phase 自顶向下走，低层次写入发生在最后 → 低层次反而成为有效数据，**无法实现层次化覆盖**，不利于集成复用。

**`uvm_config_db`**：**最高层次的配置有效**，同一层次内后写入有效。

| | `uvm_resource_db` | `uvm_config_db` |
| --- | --- | --- |
| 层次 | 无关 | 继承自 resource_db |
| 同配置多条 | last write wins | parent wins（越靠近根越优先） |
| 是否支持通配 | 否 | 是（`set_scope` 支持 `* ? .`） |

> ★ **坑（同一层级"最后写的先"）**：`config_db` 的优先级是 `1000 - cntxt.get_depth()`，取**数值最大**者，即**越靠近根越优先**；同优先级时是"最后写的先"。

## 10. 传递 interface 时为什么要用 `virtual`？

底层组件（如 driver）通过 `uvm_config_db::get` 拿到的是顶层传下来的接口。这个接口**必须用 `virtual` 声明**，即实际接口的**句柄**。

如果不加 `virtual`，传的是一个**实际的物理接口**，这在纯软件（类）环境里根本无法实现，会报错。

## 11. 低层次组件能把句柄通过 config_db 传给高层次的组件吗？

**不建议**。惯例是：**高层次的组件 set，低层次的组件 get**。

反过来的话：一对多读取虽然天然成立（`read()` 只 return 不消耗），但会让数据流向混乱。

## 12. 在 sequence 里能用 `config_db` 吗？

能，但**主要问题是路径**。

- 在 sequence 里调 `get_full_name()` 得到的是"此 sequence 挂载的 sequencer 路径 + 实例化时传的名字"，例如 `uvm_test_top.env.i_agt.sqr.case0_sequence`。
- **`set`**：第 1 个参数 `this`，第 2 个参数是挂载的 sequencer 路径 + 通配符（因为 sequence 实例化时名字不固定）。
- **`get`**：第 1 个参数**不能是 `this`**（sequence 不是 component），要用 `null` 或 `uvm_root::get()`；第 2 个参数用 `get_full_name()`。

## 13. interface 能直接传到 sequence 里吗？

稳妥做法：**先用 `config_db` 把 virtual interface 从 tb 传到 sqr，再由 sequence 通过 `p_sequencer` 从 sqr 拿**。

直接把 interface `set` 到 sequence 里是否可行——原书说 sequencer 机制对 config_db 提供了支持，但实践中很少这么用（sequence 不是 component，`cntxt` 参数没有意义）。

## 14. callback 机制是什么？和 factory 有什么区别？

**作用**：

- 提高验证平台可重用性。
- 不创建复杂层次结构的前提下，在组件某些行为前后**内嵌**函数/任务，一个环境跑多个用例。
- 用它构造异常测试用例（比如在 driver 把激励发到 DUT 之前注入错误）。

**使用步骤**：

1. 在 UVM 组件中**内嵌** callback 函数/任务。
2. **声明**一个 `uvm_callback` 空壳类。
3. **扩展**空壳类。
4. 在环境中**创建并登记** callback 实例（`uvm_register_cb`）。

**与 factory 的区别**：

| | factory override | callback |
| --- | --- | --- |
| 类本身 | **产生一个新的扩展类**替换原对象 | 类还是原先的类 |
| 改什么 | 对象类型 | 类内部的 callback 函数 |

典型场景——在激励发到 DUT 前翻转 CRC 的一位做错误注入：

```systemverilog
// 1) 定义 packet 类
class packet_c;
  byte [4] src_addr, dst_addr;
  byte []  data;
  byte [4] crc;
endclass

// 2) 定义会用到这个 packet 的 driver
class pkt_driver extends uvm_component;
  `uvm_component_utils(pkt_driver)
  `uvm_register_cb(pkt_driver, pkt_driver_cb)   // 3) 登记 callback 类

  virtual task run_phase(uvm_phase phase);
    forever begin
      seq_item_port.get_next_item(pkt);
      `uvm_do_callbacks(pkt_driver, pkt_driver_cb, corrupt_packet(pkt))
      // ... 驱动到 DUT
    end
  endtask
endclass

// 4) 定义 callback 类，实现 corrupt_packet
class pkt_driver_cb extends uvm_callback;
  function new(string name = "pkt_driver_cb"); super.new(name); endfunction
  virtual task corrupt_packet(packet_c pkt);
    pkt.crc[0][0] = ~pkt.crc[0][0];   // 翻转 CRC 第 0 字节的第 0 位
  endtask
endclass
```

## 相关笔记

- [[UVM · 组件与工厂]]
- [[面试题 · UVM 平台与组件]] — component / object、is_active、启动与结束
- [[面试题 · UVM 序列与仲裁]] — sequence 里的 config_db 用法
- [[错题本 · 静默失败类]] — `apply_config_settings` 只对注册字段生效

## 避坑指南

- [ ] override 三个条件：都注册 / `create` 实例化 / 覆盖前调用 / 子类 + virtual
- [ ] `config_db` vs `resource_db`：parent wins vs last write wins
- [ ] sequence 里 `get` 的 `cntxt` 不能写 `this`
- [ ] 接口必须 `virtual`，否则软件环境编译报错
- [ ] `uvm_field_*` 没注册的字段，`config_db` 拿不到