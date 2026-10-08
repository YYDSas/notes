/* 自测题库 —— 由笔记内容整理，每题对应一篇笔记。
   字段：id / note(笔记路径，用于跳回原文) / title / cat / q(题干) / a(答案要点) */
window.QUIZ_QUESTIONS = [
 {
  "id": "svmap-1",
  "note": "notes/SystemVerilog/知识地图.md",
  "title": "SV · 知识地图",
  "cat": "SystemVerilog",
  "q": "判断\"代码里有几个对象\"最可靠的方法是什么？（列出哪些写法不产生对象）",
  "a": "数 new() 执行了几次 —— 调了几次 new 就有几个对象。\n不产生对象的写法：① 只声明句柄（Transaction t;）② 句柄赋值 t2 = t1;（只是复制门牌号）③ push_back 进队列（存的是句柄）④ 句柄数组 new[5]（只分配 5 个空槽，槽里是 null）。"
 },
 {
  "id": "svmap-2",
  "note": "notes/SystemVerilog/知识地图.md",
  "title": "SV · 知识地图",
  "cat": "SystemVerilog",
  "q": "遇到\"看着对但结果是错的\"这类问题，笔记里建议先问自己哪一个判断题？为什么？",
  "a": "先问\"这是句柄还是对象\"。\n因为绝大多数 SV 陷阱都出在这个区分上：句柄复制 vs 对象复制、共享 vs 独立、静态类型 vs 实际类型。"
 },
 {
  "id": "svmap-3",
  "note": "notes/SystemVerilog/知识地图.md",
  "title": "SV · 知识地图",
  "cat": "SystemVerilog",
  "q": "概念拿不准时，本机有什么条件可以当场确认？写出标准命令。",
  "a": "本机装了 QuestaSim，任何行为都可以实测，不要靠记忆或二手资料：\n  vlog -sv x.sv\n  vsim -c -do \"run -all; quit -f\" <顶层模块名>\n（UVM 例子用 vsim -c -L mtiUvm +UVM_TESTNAME=<test> <top>）"
 },
 {
  "id": "svclass-1",
  "note": "notes/SystemVerilog/类与对象基础.md",
  "title": "SV · 类与对象基础",
  "cat": "SystemVerilog",
  "q": "SV 函数参数默认按值传递。为什么下面这段外面拿不到新对象？正确写法是什么？\nfunction void create(Transaction tr); tr = new(); endfunction\nTransaction t;\ncreate(t);\nt.addr = 10;",
  "a": "因为默认传的是【句柄的副本】。执行过程：\n① 传参时 tr 拿到 t 的副本（此时都是 null）\n② tr = new() 只让局部变量 tr 指向新对象，外部 t 不受影响\n③ 函数返回后 tr 销毁，新对象失去引用成为垃圾\n④ 外部 t 从头到尾都是 null → t.addr 空指针访问\n正确写法：function automatic void create(ref Transaction tr);\n必须加 ref；且带 ref 形参的函数/任务【必须声明为 automatic】（否则 vlog-13300）。"
 },
 {
  "id": "svclass-2",
  "note": "notes/SystemVerilog/类与对象基础.md",
  "title": "SV · 类与对象基础",
  "cat": "SystemVerilog",
  "q": "下面循环结束后 fifo[0] / fifo[1] / fifo[2] 各是多少？为什么？要保存 3 个不同状态怎么改？\nt = new();\nfor (int i = 0; i < 3; i++) begin\n  t.addr = i << 2;\n  fifo.push_back(t);\nend",
  "a": "全是 8。\npush_back 存的是【句柄】不是快照，三次压入的是同一个对象；循环结束后该对象 addr 停在 2<<2 = 8。\n改法：把 new() 挪进循环 —— 每次 new 出一个新对象再压入，这样 3 个元素分别是 0、4、8。"
 },
 {
  "id": "svclass-3",
  "note": "notes/SystemVerilog/类与对象基础.md",
  "title": "SV · 类与对象基础",
  "cat": "SystemVerilog",
  "q": "类里 logic [31:0] addr = 'h10;，构造函数 new(int a = 3, int d = 5) 里写了 addr = a;。\n调用 new(10) 之后 addr / a / d 各是多少？",
  "a": "addr = 10、a = 10、d = 5。\n规则：声明处的初始化【先执行】（addr = 'h10 = 十进制 16），构造函数体【后执行】并覆盖它（addr = a = 10）。\na 被外部传入的 10 覆盖了默认值 3；d 没传，用默认值 5。\n易混点：'h10 是十六进制 = 16，传入的 10 是十进制 = 10。"
 },
 {
  "id": "svencap-1",
  "note": "notes/SystemVerilog/封装-local-protected.md",
  "title": "SV · 封装 local / protected",
  "cat": "SystemVerilog",
  "q": "local 和 protected 的分界线在哪？各自谁能访问？用一句口诀记。",
  "a": "protected：本类 ✅、子类 ✅、类外部 ❌\nlocal    ：本类 ✅、子类 ❌、类外部 ❌\n分界线就是【子类】：protected 允许子类，local 连子类都拒绝。\n口诀：local 是\"亲儿子都不给看\"，protected 是\"亲儿子可以看\"。"
 },
 {
  "id": "svencap-2",
  "note": "notes/SystemVerilog/封装-local-protected.md",
  "title": "SV · 封装 local / protected",
  "cat": "SystemVerilog",
  "q": "clock 类里 is_summer / nclock 都是 local，get_clock() 和 set_summer() 是 public。\nck.get_clock() → 6；ck.set_summer(1)；ck.get_clock() → 7；那么 ck.nclock 呢？",
  "a": "编译报错：Illegal access to local member nclock（vlog-8688）。\n注意陷阱：set_summer(1) 调用本身【合法】，确实把 is_summer 改成了 1，所以第二次 get_clock() 才返回 7。\n但题目若让你【直接访问 ck.nclock】，就撞上 local 的限制 —— 这就是考点。"
 },
 {
  "id": "svencap-3",
  "note": "notes/SystemVerilog/封装-local-protected.md",
  "title": "SV · 封装 local / protected",
  "cat": "SystemVerilog",
  "q": "为什么需要封装？列三条理由。",
  "a": "① 隐藏实现细节：外部只能通过 get_clock() / set_summer() 交互，不能乱改内部状态\n② 可维护：内部算法改了（比如夏天改成 +2），外部调用代码一行都不用动\n③ 防误用：避免外部代码绕过校验直接写字段"
 },
 {
  "id": "svinherit-1",
  "note": "notes/SystemVerilog/继承与virtual方法.md",
  "title": "SV · 继承与 virtual 方法",
  "cat": "SystemVerilog",
  "q": "super.clone(ct) 里的 super 到底是什么？应该怎么读它？",
  "a": "super 是「父类版本的方法」，不是句柄、不指向任何对象。\n读作\"调用【父类版本的】clone 方法\"，是【静态绑定】，不受多态影响。\n错误读法：\"父类句柄调 clone\"。"
 },
 {
  "id": "svinherit-2",
  "note": "notes/SystemVerilog/继承与virtual方法.md",
  "title": "SV · 继承与 virtual 方法",
  "cat": "SystemVerilog",
  "q": "t2 = t1.clone() 这次调用里，clone 内部一共执行了几次 new()？t1 和 t2 是同一个对象吗？",
  "a": "1 次。t1.clone() 没传参数，用的默认值 null → 子类 clone 里走 ct = new() 分支，造出新对象。\n不是同一个对象：t2 是 clone 出来的新对象（t1 是原对象）。\n父类 clone 被调用时收到的是 ct（非 null），所以【不再 new】。"
 },
 {
  "id": "svinherit-3",
  "note": "notes/SystemVerilog/继承与virtual方法.md",
  "title": "SV · 继承与 virtual 方法",
  "cat": "SystemVerilog",
  "q": "clone 里写 c.data = this.data;（data 是动态数组），这是深拷贝还是浅拷贝？要深拷贝怎么写？",
  "a": "浅拷贝。data 是动态数组，赋的是【句柄】，新对象和源对象共享同一块数组内存。\n深拷贝：c.data = new[this.data.size()](this.data);"
 },
 {
  "id": "svcast-1",
  "note": "notes/SystemVerilog/类型转换与cast.md",
  "title": "SV · 类型转换与 $cast",
  "cat": "SystemVerilog",
  "q": "用一句话说 $cast 到底做了什么？它【不】做什么？",
  "a": "做两件事：① 运行时类型检查 ② 给同一个对象【再加一个句柄】。\n不做的：不创建对象、不复制数据、不改变对象的实际类型。\n它的定位是\"给同一个对象换一个更具体的句柄\"。"
 },
 {
  "id": "svcast-2",
  "note": "notes/SystemVerilog/类型转换与cast.md",
  "title": "SV · 类型转换与 $cast",
  "cat": "SystemVerilog",
  "q": "$cast 的两个反直觉行为：源句柄是 null 时返回什么？类型不匹配失败时目标句柄会怎样？",
  "a": "① 源为 null 时返回 1（\"成功\"），目标句柄被赋为 null —— 不报错不警告，等你调方法才崩。\n② 类型不匹配时返回 0，且【目标句柄保持原值】，不会被置成 null。\n推论：绝不能依赖\"失败后目标会变 null\"来兜底，必须判返回值。最危险的形态是循环里复用同一个目标句柄 —— 某轮失败后它还保留着上一轮成功的对象，访问到的是错误对象，不报空指针、数据静默错乱。"
 },
 {
  "id": "svcast-3",
  "note": "notes/SystemVerilog/类型转换与cast.md",
  "title": "SV · 类型转换与 $cast",
  "cat": "SystemVerilog",
  "q": "enum 和 int 互转：哪个方向必须用 $cast？$cast 检查的是区间还是成员？函数形式和语句形式越界时行为差在哪？",
  "a": "enum → int：【不需要】转换，直接赋值（同族子类型天然合法）。\nint → enum：【必须】$cast（这才是 $cast 存在的核心理由）。\n检查的是「这个值是不是枚举成员」，【不是】区间 —— 枚举值可以不连续（如 {A=0, B=10}），$cast 只认成员。\n函数形式 ok = $cast(val, cor); 越界返回 0，静默；语句形式 $cast(val, cor); 越界【硬报错】vsim-3971。\n报错原文格式是「to type X from Y」：X 是【目标】（第一个参数），Y 是【源】—— 方向最容易读反。"
 },
 {
  "id": "svwidth-1",
  "note": "notes/SystemVerilog/数据类型与位宽.md",
  "title": "SV · 数据类型与位宽",
  "cat": "SystemVerilog",
  "q": "bit [3:0][7:0] arry [2:0]; 的 $bits / $size / $dimensions 各是多少？哪边是打包维度？",
  "a": "$bits = 96、$size = 3、$dimensions = 2。\n变量名【左边】是打包维度 [3:0][7:0]（4×8 = 32 bit），【右边】是非打包维度 [2:0]（3 个元素）。\n所以：$size(arry) = 3（第一维 = 非打包维度），$size(arry,2) = 4，$bits(arry[0][0]) = 8。"
 },
 {
  "id": "svwidth-2",
  "note": "notes/SystemVerilog/数据类型与位宽.md",
  "title": "SV · 数据类型与位宽",
  "cat": "SystemVerilog",
  "q": "bit [3:0][7:0] arry [1:0]; arry[0] = 16'hFF; 之后 arry[0] 是多少？会报警告吗？",
  "a": "arry[0] = 32'h0000_00FF，高位【零扩展】。\n不会报警告（实测 Warnings: 0）—— 扩展和截断【两个方向都静默】。\n想要满字节 FF 要写 32'hFFFF_FFFF 或 {4{8'hFF}}；16'hFFFF 只会得到 0000ffff。"
 },
 {
  "id": "svwidth-3",
  "note": "notes/SystemVerilog/数据类型与位宽.md",
  "title": "SV · 数据类型与位宽",
  "cat": "SystemVerilog",
  "q": "重复拼接 {n{expr}} 的两条硬约束是什么？{4{4'hFF}} 得到多少位、值是多少？",
  "a": "规则：内层复制 n 份，位宽 = 内层位宽 × n（自决定，不被上下文撑宽）。\n两条硬约束（都实测报错）：\n① 内层字面量必须【定宽】—— {4{'hFF}} 里 'hFF 是 unsized（按 32 位算）→ 结果 128 位并报 vopt-2121 Illegal concatenation of an unsized constant\n② 重复次数必须是【常量】—— {n{4'hF}}（n 是变量）→ vlog-8303 Repetition multiplier must be constant\n{4{4'hFF}}：内层 4'hFF 先被截成 4'b1111，重复 4 次 = 16'hFFFF（同时报 vlog-2600 Redundant digits）。\n易混：{4{4'h1}} = 16'h1111（不是 ffff）；{16{1'b1}} = 16'hFFFF。"
 },
 {
  "id": "svarray-1",
  "note": "notes/SystemVerilog/数组与队列.md",
  "title": "SV · 数组与队列",
  "cat": "SystemVerilog",
  "q": "动态数组 byte a[]; 和队列 byte q[$]; 在\"要不要 new\"上有什么区别？\n句柄数组 packet ps[] = new[5]; 之后，一共创建了几个对象？",
  "a": "动态数组【必须】a = new[n] 才有元素；队列【声明即创建】，是\"空但可用\"的状态，直接 push_back / size()。\n句柄数组 new[5] 之后：【0 个对象】。new[5] 只分配 5 个【句柄槽】，槽里全是 null，不会替每个元素调构造函数。\n要有对象还得逐个 ps[i] = new();"
 },
 {
  "id": "svarray-2",
  "note": "notes/SystemVerilog/数组与队列.md",
  "title": "SV · 数组与队列",
  "cat": "SystemVerilog",
  "q": "ps = new[8](ps); 和 ps = new[8]; 的区别是什么？",
  "a": "带括号的第二个参数是【源数组】：新建 8 个，前 5 个复制旧内容，新增 3 个为 null —— 语义是\"新建更大的、把老的拷进来\"。\n不带源参数的 new[8] 是【全新分配】，老元素全部丢失。"
 },
 {
  "id": "svarray-3",
  "note": "notes/SystemVerilog/数组与队列.md",
  "title": "SV · 数组与队列",
  "cat": "SystemVerilog",
  "q": "packet comp [2]; 和 packet comp2 [0:2]; 的 $size 和合法下标分别是多少？\n另外 Questa 对固定尺寸非打包数组的常量越界访问是什么行为？",
  "a": "comp[2]：单个数字 = 元素【个数】→ $size = 2，合法下标 0、1\ncomp2[0:2]：范围写法 = 下标【范围】→ $size = 3，合法下标 0、1、2\nQuesta 对固定尺寸非打包数组的【常量】越界访问【不报错】（声明 comp[2] 却访问 comp[2]：编译 0 错 0 警、运行静默通过）。\n所以 off-by-one 不会自己暴露 —— 写遍历一律用 foreach，或先 $size() 自保。"
 },
 {
  "id": "svrand-1",
  "note": "notes/SystemVerilog/随机约束.md",
  "title": "SV · 随机约束",
  "cat": "SystemVerilog",
  "q": "p.randomize() 返回 0（失败）时，rand 变量会变成什么？你打算怎么测出这个结论？",
  "a": "失败时 rand 变量【保持原值不变】，不会清零。\n测法：必须先给哨兵值（比如先设 length = 777）或先成功随一次 —— 因为对象 new() 后 rand 本来就是 0，用 0 根本区分不了\"清零\"和\"保持\"。\n结论要点：LRM 未强制规定失败后的取值（实现相关），所以【绝不能依赖失败后的值，必须判断 randomize() 的返回值】。"
 },
 {
  "id": "svrand-2",
  "note": "notes/SystemVerilog/随机约束.md",
  "title": "SV · 随机约束",
  "cat": "SystemVerilog",
  "q": "inside {3,5} 和 inside {[3:5]} 有什么区别？\n如果类内写 da.size() inside {[3:5]}，inline 写 da.size() inside {3,5}，最终 size 能取哪些值？",
  "a": "{3,5} 是【枚举集合】，只有 3 和 5 两个成员；{[3:5]} 是【区间】，含 3、4、5。\ninline 约束与类内约束是【求交】→ 最终 size ∈ {3, 5}，【长度 4 不可能】。\n别把 {3,5} 口头读成\"3 到 5\"；看到 inside 先逐字符确认是花括号枚举还是方括号区间。\n联动：foreach(da[i]) da[i] < da[i+1]; 展开的条数 = size()-1，由随机结果反推，不是固定的（size=3 时 2 条，size=5 时 4 条）。"
 },
 {
  "id": "svrand-3",
  "note": "notes/SystemVerilog/随机约束.md",
  "title": "SV · 随机约束",
  "cat": "SystemVerilog",
  "q": "rand bit [7:0] payload[]; 【漏掉】payload.size() 约束会怎样？\nsolve ... before ...; 有什么语法限制？",
  "a": "漏掉 size 约束时 randomize() 返回 1（成功！）但 size = 0 —— 无 error、无 warning，静默失败；cg.sample() 调 0 次，功能覆盖率 0%。\n两条必记：① 动态数组的 size 必须显式约束 ② 约束了 size ≠ 约束了元素，逐元素要用 foreach(payload[i])。\nsolve ... before ...; 【只能写变量名】，写表达式（如 payload.size()）报 vlog-13022。正确做法是加辅助变量：\n  rand int pkt_len;\n  constraint c { solve pkt_len before fsm_state; payload.size() == pkt_len; }"
 },
 {
  "id": "svclock-1",
  "note": "notes/SystemVerilog/时钟与竞争.md",
  "title": "SV · 时钟与竞争",
  "cat": "SystemVerilog",
  "q": "什么是竞争窗口？用时间戳把实测现象描述出来。",
  "a": "TB 在 posedge 驱动、监视器在【同一时刻】采样读值 → 同一时刻既读到旧值又写入新值：\n  [25000] posedge | plain_if.sig = 0     ← 监视器读到旧值 0\n  [25000] TB (plain): drove sig=1        ← TB 在同一时刻写入 1\n谁先谁后由仿真器调度决定，【标准不保证顺序】。这就是经典 race condition。\n基本时序纪律：数据在 negedge 改，采样在 posedge 等 —— 让驱动和采样天然错开半个周期。"
 },
 {
  "id": "svclock-2",
  "note": "notes/SystemVerilog/时钟与竞争.md",
  "title": "SV · 时钟与竞争",
  "cat": "SystemVerilog",
  "q": "clocking block 怎么消除竞争？output #1ns 和 input #1ns 各自的语义是什么？",
  "a": "output #1ns：驱动【推迟】到采样点之后 1ns 才生效\ninput #1ns ：采样取的是【1ns 之前】的稳定值\n实测：改用 output #1ns 后，驱动落到 posedge+1ns，无人竞争。\n它的价值：把\"什么时候驱动、什么时候采样\"从【运行期运气】变成【接口里的规格】—— 这也是 UVM 里 interface 内建 drv_ck / mon_ck 的原因。"
 },
 {
  "id": "svclock-3",
  "note": "notes/SystemVerilog/时钟与竞争.md",
  "title": "SV · 时钟与竞争",
  "cat": "SystemVerilog",
  "q": "实测发现：用了 clocking 和不用 clocking，sum 都是 60。这说明什么？正确的教学口径是什么？",
  "a": "说明这次竞争【碰巧】没有导致错误结果（Questa 在 -O0/-O3/-O5 下调度一致）。\n正确口径：「竞争没出错」不等于「没有竞争」。\nSV 标准不保证顺序，clocking 的价值是【从结构上确定顺序，而不是依赖运气】—— 换工具、换版本、换优化级别都可能翻车。"
 },
 {
  "id": "svcov-1",
  "note": "notes/SystemVerilog/功能覆盖率.md",
  "title": "SV · 功能覆盖率",
  "cat": "SystemVerilog",
  "q": "单个 covergroup 的分数怎么算？$get_coverage() 怎么算？报告里的 \"32/95 仓\" 是总分吗？",
  "a": "单个 coverpoint / cross：命中仓 ÷ 该项总仓数（default / illegal_bins 不计入分母）\n单个 covergroup：它各项（coverpoint + cross）百分比的【加权平均】（默认权重 1）\n$get_coverage()：所有 covergroup 分数的【算术平均】（每个 CG 等权，与仓数无关）\n不是。32/95 只是\"命中仓数/总仓数\"（= 33.68%），而 TOTAL 是 66.52% —— 一个 64 仓的 cross 和一个 3 仓的 coverpoint 在总分里权重相同。"
 },
 {
  "id": "svcov-2",
  "note": "notes/SystemVerilog/功能覆盖率.md",
  "title": "SV · 功能覆盖率",
  "cat": "SystemVerilog",
  "q": "MCDF basic test 总分 53.47% 是怎么算出来的？\n为什么 cg_mcdf_reg_write_read 的分数就等于它那个 cross 的分数（12/18）？",
  "a": "53.47 = (66.67 + 41.67 + 66.67 + 25 + 87.5 + 33.33) / 6 —— 6 个 covergroup 等权平均。\n原因是那三个 covergroup 把 addr / cmd / wdata / rdata 这些\"只为喂 cross\"的 coverpoint 全设了 type_option.weight = 0\n→ 这些项被【从评分里剔除】，于是 covergroup 分数就等于主 cross 的分数。\n（没设 weight 的 cg_formatter_length 就是 (100 + 75)/2 = 87.5。）\n实用推论：想让某个 coverpoint\"只统计不拉分\"，给它 type_option.weight = 0。"
 },
 {
  "id": "svcov-3",
  "note": "notes/SystemVerilog/功能覆盖率.md",
  "title": "SV · 功能覆盖率",
  "cat": "SystemVerilog",
  "q": "Questa 覆盖率\"跑不出来\"的头号根因是什么？写出正确流程，并说明为什么 save 要写在 run 之前。",
  "a": "根因：控制台模式下 TB 里的 $finish 会【终止 -do 脚本】，所以写在 run -all【之后】的 coverage save / report 根本执行不到 —— 命令不报错，但等于没写。\n正确流程：\n  vlog -work w -sv -cover bsectf xxx.sv\n  vsim -work w -coverage -c top -do \"coverage save -onexit c.ucdb; run -all; quit -f\"\n  vcover report -cvg -details c.ucdb\n因为 -onexit 是【退出钩子】，提前登记才能在 $finish 之后仍然写盘。vlog 和 vsim 必须【同时】带覆盖率选项。\n（另一种解法：TB 无 $finish 时可用限时 run，如 -do \"run 200ns; coverage save c.ucdb; quit -f\"。）"
 },
 {
  "id": "svprint-1",
  "note": "notes/SystemVerilog/系统任务与打印.md",
  "title": "SV · 系统任务与打印",
  "cat": "SystemVerilog",
  "q": "想打印一行 \"sum = 100%\" 该怎么写？直接写 % 会怎样？",
  "a": "必须写 %%（即 \"sum = 100%%\"）。\n裸百分号会报 (vopt-2122) Invalid format specification，并连锁 vopt-2064 back-end code generation terminated with code 2 → Error loading design。\n另一个方向：参数多于格式符时 Questa 按默认十进制补打，属实现行为、不可移植；而漏给参数的 %d 会报 vopt-2123（硬报错）。"
 },
 {
  "id": "svprint-2",
  "note": "notes/SystemVerilog/系统任务与打印.md",
  "title": "SV · 系统任务与打印",
  "cat": "SystemVerilog",
  "q": "为什么探针脚本的打印标签必须是纯 ASCII？还有哪个字符在 $display 字符串里不能出现？",
  "a": "因为 Questa 控制台会把 $display 里的中文显示成 ?????? 或乱码（编码问题）。写 [PHASE] start 而不是 [相位] 开始。\n另一个：字符串里【不能嵌套 ASCII 双引号】，会直接编译报错 vlog-13067 unexpected non-printable character。\n（顺带：没有 xdisplay 这个任务，只有 $display / $write / $strobe / $monitor，漏写 $ 会报 vopt-7063 Failed to find。）"
 },
 {
  "id": "svprint-3",
  "note": "notes/SystemVerilog/系统任务与打印.md",
  "title": "SV · 系统任务与打印",
  "cat": "SystemVerilog",
  "q": "$timeformat(unit_number, ...) 的 unit_number 是什么含义？\n默认 ps 下 2.234ns 打印成 2234，怎么让它显示成 2.234ns？为什么 $time 打不出小数？",
  "a": "unit_number = 【log10(秒)】：-12 = ps、-9 = ns、-6 = us、-3 = ms、0 = s。\n$timeformat(-9, 3, \"ns\", 0) → 输出 2.234ns。\n小数部分【只有 $realtime 有】：同一时刻 $time 打印 2000.00ps（整数 2ns 再换算），$realtime 打印 2234.00ps。\n另外 %t 按 timescale 的【精度】渲染：1ns/1ps 下 1ns 打印成 @1000；想显示成 @1ns 就设 $timeformat(-9, 0, \"ns\", 0) 或把 timescale 写成 1ns/1ns。"
 },
 {
  "id": "errindex-1",
  "note": "notes/SV错题本/索引.md",
  "title": "错题本 · 索引",
  "cat": "SV错题本",
  "q": "代码书写类和结构理解类的区别是什么？哪个更危险？",
  "a": "代码书写类：手滑/疏忽，特点重复率高、修起来快，【编译器能抓出来】。\n结构理解类：概念理解偏了，看着对其实错，【编译器抓不出来】。\n一句话：书写类让你编译不过，理解类让你编译通过但结果是错的 —— 后者更危险。"
 },
 {
  "id": "errindex-2",
  "note": "notes/SV错题本/索引.md",
  "title": "错题本 · 索引",
  "cat": "SV错题本",
  "q": "\"编译通过但返回值是 0\"最可能是什么书写错误？为什么说它最阴？",
  "a": "有返回值的函数【漏写 return】。\n最阴是因为：编译无警告、运行不报错，就是值不对 —— 调用方拿到 0 还以为是对的。\n要点：取值函数就 return，别在里面 $display。\"取值\"和\"打印\"是两个职责。"
 },
 {
  "id": "errindex-3",
  "note": "notes/SV错题本/索引.md",
  "title": "错题本 · 索引",
  "cat": "SV错题本",
  "q": "写完代码后的自问清单里，关于 virtual 和 push_back 各有一条什么？",
  "a": "virtual：我检查的是【基类】还是子类？—— 虚特性从基类继承，关键在基类写没写 virtual。\npush_back：我当\"拷值\"了吗？—— 它存的是【句柄】，改对象后队列里看到的就是新值。"
 },
 {
  "id": "errcode-1",
  "note": "notes/SV错题本/代码书写类错误.md",
  "title": "错题本 · 代码书写类",
  "cat": "SV错题本",
  "q": "最高频的分号类错误是哪两类？各报什么错？",
  "a": "① function / task 的【头部行】（含参数列表）漏分号 —— 报 near \"xxx\": syntax error, expecting ';'（比如后面跟 this 时会报 unexpected SystemVerilog keyword 'this'）\n② 函数调用 / 赋值语句漏分号\n③（同类）一行多个语句只写了第一个分号，如 int a, b, c 少了结尾的分号"
 },
 {
  "id": "errcode-2",
  "note": "notes/SV错题本/代码书写类错误.md",
  "title": "错题本 · 代码书写类",
  "cat": "SV错题本",
  "q": "begin...end 里把声明写在语句之后会报什么？哪种拼写错误\"最难发现\"、为什么？",
  "a": "报 Illegal declaration after the statement ... Declarations must precede statements（所有声明必须在所有语句之前，和 C 的老标准一样；每个嵌套块各自遵守）。\n最难发现的是【形参名拼错】（如 naem 写成 name）：\n编译器不报错，因为 naem 是个合法标识符，只是函数体里用到的是【成员】name，变成自己给自己赋值 —— 逻辑错了但一路静默。\n防御：形参故意用不同名字（name_i / n），或者写函数体时回头看一眼形参名。"
 },
 {
  "id": "errcode-3",
  "note": "notes/SV错题本/代码书写类错误.md",
  "title": "错题本 · 代码书写类",
  "cat": "SV错题本",
  "q": "写 covergroup 时哪个是\"静默失败\"？另外列出 covergroup 相关的其他高频书写坑。",
  "a": "静默失败：covergroup 忘 new() 或忘 sample() → 【覆盖率恒 0 且不报错】（0% 和\"真没覆盖到\"在报告里长得一样）。看到某个 covergroup 全 0，第一件事是确认它到底有没有被采样。\n其他坑：\n· covergroup 体里写变量声明/语句 → 编译不过（体里只放 coverpoint / cross / 选项）；值要先算好存进成员变量\n· coverpoint 引用了不属于本类的字段 → 编译不过，只有\"本作用域能看到的变量\"才可覆盖\n· 全角冒号 ：、全角括号 → 编译不过，报错位置常看着没问题\n· bins 区间漏方括号：{1:3} 不是区间，应写 {[1:3]}\n· new() 嵌在 function/task 里 → new() 只能属于类\n· randomize 裸调用、约束里用 = 而不是 ==（应写 p.randomize() with { pkt_type == TYPE_IP; ... }）"
 },
 {
  "id": "errstruct-1",
  "note": "notes/SV错题本/结构理解类错误.md",
  "title": "错题本 · 结构理解类",
  "cat": "SV错题本",
  "q": "for (int i = 1; i <= 4; i++) wd = new(i); 之后有几个对象？\n题目问\"当前占用\"和\"累计分配\"，答案一样吗？",
  "a": "不一样，这就是坑所在：\n· 当前占用（display 那一刻）：只有【1 个】对象存活 —— 只算 new(4) 那一个\n· 累计分配（整个执行期间）：【4 个】都算\n关键机制：wd = new(i) 是【句柄重指向】，不是累加。重新赋值后前一个对象失去唯一引用 → 成为垃圾等 GC。\n反证：把每个新对象都 push_back 进队列（保留引用），4 个就都能存活 —— 说明\"消失\"不是因为 new 没生效，而是失去了唯一引用。"
 },
 {
  "id": "errstruct-2",
  "note": "notes/SV错题本/结构理解类错误.md",
  "title": "错题本 · 结构理解类",
  "cat": "SV错题本",
  "q": "子类构造函数为什么必须先 super.new(...)？忘了会怎样？",
  "a": "因为要先把【父类那部分成员】初始化好，再初始化自己的成员。\n忘了调，父类成员就是默认值（string 是空串、int 是 0），后面打印出来是空的。\n（注意区分：super 是\"父类版本的方法\"，不是句柄。super.new(...) 就是调用父类的构造函数实现。）"
 },
 {
  "id": "errstruct-3",
  "note": "notes/SV错题本/结构理解类错误.md",
  "title": "错题本 · 结构理解类",
  "cat": "SV错题本",
  "q": "\"子类重写方法时必须写 virtual，不写就失效\" —— 这句话对吗？两组对照实验的结论是什么？",
  "a": "不对。【关键在基类】。\n· 基类有 virtual，子类去掉 virtual → 输出完全不变（虚性会自动继承）\n· 基类去掉 virtual，子类写 virtual → 【多态失效】，父类句柄永远调父类方法\n所以：基类声明了 virtual，子类同签名方法自动就是 virtual，写不写都行（写上更清晰）。\n这正是 UVM factory 能工作的前提：基类方法必须 virtual，父类句柄才能自动调到子类实现。"
 },
 {
  "id": "uvmmap-1",
  "note": "notes/UVM/知识地图.md",
  "title": "UVM · 知识地图",
  "cat": "UVM",
  "q": "九个公共相位按顺序列出来。其中哪些能消耗时间？为什么？",
  "a": "build → connect → end_of_elaboration → start_of_simulation → run → extract → check → report → final\n只有 run_phase（以及 12 个 runtime 子相位：pre_reset/reset/.../post_shutdown）是 task，可以消耗时间。\n其余八个都是 function，【零耗时】—— 所以日志里 @0 会出现一片打印，那是 function phase 在时间 0 内走完。\n查法：uvm_component.svh 里 extern virtual function|task void xxx_phase(uvm_phase phase)。"
 },
 {
  "id": "uvmmap-2",
  "note": "notes/UVM/知识地图.md",
  "title": "UVM · 知识地图",
  "cat": "UVM",
  "q": "本机怎么跑一个 UVM 例子？为什么不用自己编译 UVM 源码？",
  "a": "vlog -sv +incdir+/e/questasim/verilog_src/uvm-1.1d/src xxx.sv\n  vsim -c -L mtiUvm +UVM_TESTNAME=<test> <top> -do \"run -all; quit -f\"\n因为 Questa 自带【预编译 UVM 库 mtiUvm】（= uvm-1.1d）。映射见 E:/questasim/modelsim.ini 第 57 行。\n自己编 uvm_pkg.sv 会卡在 DPI 导出编译那一步。"
 },
 {
  "id": "uvmmap-3",
  "note": "notes/UVM/知识地图.md",
  "title": "UVM · 知识地图",
  "cat": "UVM",
  "q": "build_phase / connect_phase / run_phase 里，组件之间的执行顺序分别是什么？同一 phase 内能依赖\"谁先跑\"吗？",
  "a": "build_phase：【自顶向下】（父先子后）—— 因为父组件要先建好才能给孩子当 parent\nconnect_phase / end_of_elaboration_phase：【自底向上】（子先父后）\nrun_phase：【并发】，所有组件都在 @0 开跑\n同一 phase 内不同组件的调度顺序【不确定】（实测 START 打印顺序和创建顺序不一致）→ 代码不能依赖\"谁先跑\"。"
 },
 {
  "id": "uvmphase-1",
  "note": "notes/UVM/相位与域.md",
  "title": "UVM · 相位与域",
  "cat": "UVM",
  "q": "\"九个公共相位\"和\"runtime 子相位\"是什么关系？两条时间线在哪一点并行？",
  "a": "九个公共相位是【串行老链】；UVM 在 run 的位置【并行】挂了第二条链（reset → configure → main → shutdown，装在名为 uvm_sched 的 schedule 里）。\n两条链都在 @0 同时开工，日志只是按时间合并打印。\n源码根据（uvm_domain.svh）：m_common_domain.add(domain, .with_phase(m_common_domain.find(uvm_run_phase::get())));\n\"域（domain）\"这个词只在讲 jump 时才需要提。\n另外：链内串行（前面相位占的时间原样推后同链所有后续相位），链间并行。"
 },
 {
  "id": "uvmphase-2",
  "note": "notes/UVM/相位与域.md",
  "title": "UVM · 相位与域",
  "cat": "UVM",
  "q": "phase.jump() 的参数是什么？它是 function 还是 task？\n\"只让 comp[0] 调 jump\"，为什么 test 也跟着跳了？",
  "a": "参数是【目标相位的对象句柄】，如 uvm_reset_phase::get()（取单例），【不是字符串名】。\n它是 function（非阻塞）—— 调用即返回，实际切换发生在当前相位结束（objection 掉光）时。\n因为相位对象是【全局单例】（uvm_main_phase::get() 不属于任何单个组件），而 jump 是【域级】操作：uvm_domain::jump() 会遍历本域所有活跃相位。\n推论：① 统一复位本就是设计意图 ② \"只让 comp[0] 调\"只是避免重复发起 ③ 想让组件不参与跳转只能 set_domain() 放到另一个域 —— 只写 run_phase 的组件会掉队。"
 },
 {
  "id": "uvmphase-3",
  "note": "notes/UVM/相位与域.md",
  "title": "UVM · 相位与域",
  "cat": "UVM",
  "q": "自定义 sequencer 覆盖 run_phase 时忘了写 super.run_phase(phase) 会怎样？为什么？",
  "a": "default_sequence 不会启动。\n因为 uvm_sequencer_base::run_phase 的实现是：\n  super.run_phase(phase);\n  start_default_sequence();\nsuper 的职责就是【调用父类版本】，而 uvm_component::run_phase 内部还会调用旧式名 run()。\n（这是\"最需要记住的一条\"：uvm_component 的相位方法不是空壳。）"
 },
 {
  "id": "uvmcomp-1",
  "note": "notes/UVM/组件与工厂.md",
  "title": "UVM · 组件与工厂",
  "cat": "UVM",
  "q": "base_c 被 override 成 x_c 之后，get_name() / get_type_name() / T::type_name 各返回什么？\nget_type_name() 返回 \"<unknown>\" 说明什么？",
  "a": "get_name() → 实例名（c1 / c2，各自不同）\nget_type_name() → override 后的【实际类名】x_c（是 `uvm_*_utils 宏生成的虚函数）\nT::type_name → 静态变量，返回 base_c（注意：不带括号）\n返回 \"<unknown>\" 说明【忘写 `uvm_*_utils 注册宏】—— 这是极好的排错线索。\n另外 get_object_type() 返回工厂代理 wrapper：c1.get_object_type().get_type_name() 也是 x_c。\nget_type_name() 是验证\"工厂 override 是否生效\"最快的手段。"
 },
 {
  "id": "uvmcomp-2",
  "note": "notes/UVM/组件与工厂.md",
  "title": "UVM · 组件与工厂",
  "cat": "UVM",
  "q": "override 必须在什么时候设置才能生效？命令行 +uvm_set_type_override 的优先级如何？推荐放在哪？",
  "a": "必须在【任何组件 create 之前】设置 —— override 是\"查表时刻\"的规则，create 时查一次表。\n推荐位置：test 的 build_phase 开头（build 自顶向下，test 先于 env）。\n命令行 +uvm_set_type_override=A,B 在 build_phase 之前生效（日志 [UVM_CMDLINE_PROC]），【优先级最低】，会被代码里的 override 替换掉。\n补充：已创建的实例不受后续 override 影响，但工厂表会被替换，之后新建的组件会用新规则。"
 },
 {
  "id": "uvmcomp-3",
  "note": "notes/UVM/组件与工厂.md",
  "title": "UVM · 组件与工厂",
  "cat": "UVM",
  "q": "uvm_object 和 uvm_component 的核心区别是什么？为什么说 port / export / imp 是\"有层次的组件\"？",
  "a": "uvm_object：无层次，构造是 new(string name=\"\")，生命周期用完即弃 —— 典型如 sequence / sequence_item / config。\nuvm_component：有 name / parent，构造是 new(string name, uvm_component parent)，随仿真一直存活 —— 典型如 driver / monitor / agent / env / test。顶层 test 固定叫 uvm_test_top。\n因为 uvm_port_base（所有 port / export / imp 的基类）【继承自 uvm_component】，所以它的构造是 new(\"name\", this)（this 是 parent）—— port 是组件，不是普通对象。"
 },
 {
  "id": "uvmseq-1",
  "note": "notes/UVM/序列与sequencer.md",
  "title": "UVM · 序列与 sequencer",
  "cat": "UVM",
  "q": "run_test() 无参数时 test 名从哪来？如果命令行和参数都没给，会发生什么？",
  "a": "从命令行 +UVM_TESTNAME 取，且【命令行覆盖参数】；给了多个只取第一个并报 MULTTST 警告。\n都没给 → 不创建任何 test；若此时组件数为 0 → UVM_FATAL [NOCOMP] \"No components instantiated...\"。\ntest 的实例名固定为 uvm_test_top（factory.create_component_by_name(test_name, \"\", \"uvm_test_top\", null)）。\n另外：test 已存在还再调一次 run_test → UVM_FATAL [TTINST]。"
 },
 {
  "id": "uvmseq-2",
  "note": "notes/UVM/序列与sequencer.md",
  "title": "UVM · 序列与 sequencer",
  "cat": "UVM",
  "q": "顶层 sequence 调 start() 后依次执行哪些方法？\n为什么子 sequence（用 `uvm_do 系列）的 pre_body / post_body 不会被调用？",
  "a": "顶层（parent == null）：pre_start → pre_body → body → post_body → post_start（pre/post_body 需要 call_pre_post == 1）\n子 sequence：sub_seq.pre_start → parent_seq.pre_do(0) → parent_req.mid_do(sub_seq) → body → parent_seq.post_do(sub_seq) → sub_seq.post_start\n因为 `uvm_do 系列宏会自动把 call_pre_post 设为 0 —— 这是常见困惑点。\n其他细节：parent == null 时优先级默认 100，否则继承 parent 的优先级；start() 里还会 clear_response_queue()、注册到 sequencer、set_sequence_id(-1) 等。"
 },
 {
  "id": "uvmseq-3",
  "note": "notes/UVM/序列与sequencer.md",
  "title": "UVM · 序列与 sequencer",
  "cat": "UVM",
  "q": "m_sequencer 和 p_sequencer 有什么区别？\n用它解释\"为什么基类句柄访问不到子类 sequencer 的成员\"。",
  "a": "m_sequencer：uvm_sequence_base 的成员，类型是【基类】uvm_sequencer_base（start 时被赋值）\np_sequencer：由 `uvm_declare_p_sequencer(T) 宏生成的【具体类型】句柄，由 $cast 而来\n和 SV 的 cast 完全同理：句柄的【静态类型】决定能访问哪些成员，基类句柄看不到子类专有成员。\n宏的真实展开是在 m_set_p_sequencer() 里做 `if(!$cast(p_sequencer, m_sequencer)) `uvm_fatal(\"DCLPSQ\", ...)` —— 由 start() 过程调用。\n⚠️ 若 sequence 被挂到了类型不对的 sequencer 上，这里会直接 UVM_FATAL。"
 },
 {
  "id": "uvmtlm-1",
  "note": "notes/UVM/TLM通信.md",
  "title": "UVM · TLM 通信",
  "cat": "UVM",
  "q": "把 mailbox 换成 TLM port，核心洞察是什么？（mailbox 到底\"去哪了\"）",
  "a": "不是【消灭】mailbox，而是把它从\"跨组件连接机制\"【降级为组件内部私有缓存】。\n改造后 checker 内部仍用 chnl_mbs[0]，但外部组件不再直接摸它；monitor 只管 mon_bp_port.put(m) 交出去，不知道谁收 —— 与下游彻底解耦。\n对比：改造前 env.connect_phase 里写 chnl_agts[i].monitor.mon_mb = chker.chnl_mbs[i];（直接赋值对方内部句柄）。"
 },
 {
  "id": "uvmtlm-2",
  "note": "notes/UVM/TLM通信.md",
  "title": "UVM · TLM 通信",
  "cat": "UVM",
  "q": "port / export / imp 的合法连接链是什么？哪种连接非法？\n一个 put port 能连多个 imp 吗？要广播用什么？",
  "a": "合法：port → export → imp ✅、port → imp ✅、export → imp ✅\n非法：port → port ❌（UVM 在 connect / resolve 阶段报错）\n规则：调用方（上游）去 connect 被调方（下游）；【链的末端必须是 imp】—— imp 是真正实现方法的那一端。\n一个 put/get port 只能连【一个】imp；要广播用 uvm_analysis_port（write 是一对多）。\n命令规律：uvm_<blocking | nonblocking | 空>_<put | get | peek | get_peek | transport>_<port | export | imp>"
 },
 {
  "id": "uvmtlm-3",
  "note": "notes/UVM/TLM通信.md",
  "title": "UVM · TLM 通信",
  "cat": "UVM",
  "q": "一个 checker 要收 5 路数据，为什么方法都叫 put() 不行？`*_imp_decl 宏做了什么？\nport 必须在什么时候 new？",
  "a": "方法名都叫 put() 就【无法区分】是哪一路数据。\n`uvm_blocking_put_imp_decl(_chnl0) 宏生成【带后缀的 imp 类】，方法名随之变成 put_chnl0()：类里声明 uvm_blocking_put_imp #(mon_data_t, mcdf_checker, \"_chnl0\") chnl0_imp; 并实现 task put_chnl0(...)。\nimp 方法名由「端口类型 + 宏后缀」共同决定，对不上会在编译期报\"抽象方法未实现\"。\nport 必须在 new()（或 build_phase）里创建 —— 在 connect_phase 之后才 new 会导致连接失败。"
 },
 {
  "id": "uvmreport-1",
  "note": "notes/UVM/报告机制.md",
  "title": "UVM · 报告机制",
  "cat": "UVM",
  "q": "severity override 会影响子组件吗？实验结果是什么？想影响整棵树怎么办？",
  "a": "不会 —— severity override 【不递归，也不被子组件继承】（与创建先后无关）。\n实测（组件树 uvm_test_top → c1 → c2）：只对 test 设 override，test 自己的 WARNING 降级为 INFO 了，但 3 个子组件的 6 条警告【仍全部是 WARNING】。\n想影响整棵树，必须自己递归遍历（用 get_report_handler() + get_children(kids)），或直接用自带的 _hier 版本。\n（UVM 自己的 _hier 实现就是\"先作用于自己 + foreach(m_children[c]) 递归\"。）"
 },
 {
  "id": "uvmreport-2",
  "note": "notes/UVM/报告机制.md",
  "title": "UVM · 报告机制",
  "cat": "UVM",
  "q": "_hier 家族里唯独【没有】哪个？只想\"消音\"不想降级时该用什么？",
  "a": "三类都有递归版本：verbosity → set_report_verbosity_level_hier；action → set_report_severity_id_action_hier；file → set_report_severity_id_file_hier。\n唯独【没有 set_report_severity_id_override_hier】。\n只想消音就用自带的 set_report_severity_id_action_hier(UVM_WARNING, \"RUN\", UVM_NO_ACTION)，不必手写递归。\n建议调用位置：end_of_elaboration_phase（组件树已建完）。"
 },
 {
  "id": "uvmreport-3",
  "note": "notes/UVM/报告机制.md",
  "title": "UVM · 报告机制",
  "cat": "UVM",
  "q": "消息 ID 该用 get_type_name() 还是 get_name()？为什么？访问 m_children 有什么风险？",
  "a": "用 get_type_name() —— 显示 [name_test]，能【按\"类\"聚合统计】（UVM 官方惯例）；get_name() 是按实例分组（显示 [uvm_test_top]）。\n大平台里消息成千上万，只有按类聚合才统计得动。\n访问权限暗礁：m_rh（report handler）是 public；【m_children 是 protected】。\n所以 children[i].m_rh 合法，但直接 h.m_children[i] 是踩边界写法 —— Questa 10.7c 接受，VCS/Xcelium 可能拒绝。稳妥用公开 API：c.get_report_handler() + h.get_children(kids)。\n另外写递归时必踩：块内【声明必须在任何语句之前】（Illegal declaration after the statement）。"
 },
 {
  "id": "toolpit-1",
  "note": "notes/仿真工具/Questa避坑手册.md",
  "title": "仿真工具 · Questa 避坑手册",
  "cat": "仿真工具",
  "q": "跑仿真的标准流程是什么？为什么说\"vlog 通过不等于能跑\"？",
  "a": "vlog -sv -work work tb.sv\n  vsim -c work.tb -do \"run -all; quit -f\"      （-c 控制台模式，不弹 GUI）\n因为 vlog 【不报语义错误】—— 很多问题要到 vsim 的 vopt 阶段才暴露（vopt-7063 Failed to find / vopt-2123 Missing argument for format specification 等）。\nUVM 例子：vlog -sv +incdir+/e/questasim/verilog_src/uvm-1.1d/src tb.sv → vsim -c -L mtiUvm +UVM_TESTNAME=my_test work.tb -do \"run -all; quit -f\"。"
 },
 {
  "id": "toolpit-2",
  "note": "notes/仿真工具/Questa避坑手册.md",
  "title": "仿真工具 · Questa 避坑手册",
  "cat": "仿真工具",
  "q": "DPI-C 全流程的四步命令是什么？\"三个必须记住的点\"是哪三个？",
  "a": "export PATH=\"/e/Mingwn/bin:$PATH\"\n  ① vlog -sv +incdir+<questa>/verilog_src/uvm-1.1d/src dpi_c_demo.sv\n  ② vsim -c -dpiexportobj dpi_export.obj -L mtiUvm tb -do \"quit -f\"\n  ③ gcc -shared -o dpi_cases.dll dpi_cases.c dpi_export.obj -I<E:/questasim/include> -L<E:/questasim/win64> -lmtipli\n  ④ vsim -c -L mtiUvm -sv_lib dpi_cases tb -do \"run -all; quit -f\"\n三点：\n① 必须有 C 编译器，否则 vsim 加载设计报 vsim-7019 Can't locate a C/C++ compiler for 'DPI Export Compilation'\n② 【必须链 -lmtipli】，它提供 svGetScope / mti_svExecuteTaskOrFunction / vl_trace_dpi_call 等符号，不链报 undefined reference to svGetScope\n③ 用绝对路径调 gcc.exe 会失败（cannot execute 'as'）—— gcc 是驱动，靠 PATH 找 as.exe / ld.exe，【必须把 bin 目录加进 PATH】"
 },
 {
  "id": "toolpit-3",
  "note": "notes/仿真工具/Questa避坑手册.md",
  "title": "仿真工具 · Questa 避坑手册",
  "cat": "仿真工具",
  "q": "DPI 的头号坑是什么？\n另外：库里已存在目录报 vlib-35、60+ 个 undefined macro 连锁报错，分别怎么解？",
  "a": "头号坑：C 侧要回调 SV 的 task 时，import 声明必须是\n  import \"DPI-C\" context task c_main();\n写成 function 会 Fatal：vsim-3757 exported task must be called from a context imported *task*（纯 function 里不允许调 task），且导出 function 的调用报 vsim-3756。\nvlib-35 Failed to create directory：库里【已存在】该目录 → 先 rm -rf <lib>，再 vlib <lib> 正规创建。\n60+ undefined macro：纯 `define 文件（如 param_def.v）必须【复制到当前目录并加 +incdir+.】，否则 package 内看不到宏。\n（另外还有：vsim-3009 [TSCALE] = interface/module 没写 `timescale；vlog-13053 = `timescale 的反引号打成了单引号。）"
 },
 {
  "id": "toolenv-1",
  "note": "notes/仿真工具/环境搭建.md",
  "title": "仿真工具 · 环境搭建",
  "cat": "仿真工具",
  "q": "Tagbar 装了却看不到大纲，真实根因是什么？怎么修？",
  "a": "根因：C:\\\\Program Files\\\\Vim\\\\_vimrc 里有一条【更早注册】的\n  autocmd BufRead,BufNewFile *.sv,*.svh setfiletype verilog\n而 setfiletype 【只在 filetype 为空时生效】→ .sv 的 filetype 实际是 verilog，\n于是 g:tagbar_type_systemverilog 永远匹配不上，ctags 被强制走 Verilog 解析器 —— class / package 全出不来。\n修法：在 gvimrc_svuvm.vim 里用【强制的 set filetype=systemverilog】（不能用 setfiletype），因为它比 _vimrc 后加载。\n附带两条：① 必须显式配 g:tagbar_ctags_bin='E:/Mingwn/bin/ctags.exe'（Mingwn 不在系统 PATH，从资源管理器启动的 gvim 找不到 ctags → 侧栏空窗）\n② kinds 字母要用 uctags 的简写：C class | K package | I interface | m module | f function | t task（旧配置里 c:class / p:package / i:interface / e:typedef 全错）。"
 },
 {
  "id": "toolenv-2",
  "note": "notes/仿真工具/环境搭建.md",
  "title": "仿真工具 · 环境搭建",
  "cat": "仿真工具",
  "q": "slang / vscode-slang 是什么？它的能力边界在哪？",
  "a": "slang：Mike Popoloski（HRT）写的 SystemVerilog 前端库（MIT），含 CLI 可编译 + lint 整个 SV 工程；是 CHIPS Alliance sv-tests 唯一全通过的开放前端。\nslang-server：HRT「Surge」项目的 SV LSP 语言服务器；VS Code 客户端是扩展 vscode-slang（publisher Hudson-River-Trading，会自动下载二进制，无需 license）。\n能力：实时 lint、跳转定义/引用/补全、inlay hints、按 .f 文件列表与 top elaborate 后浏览层次树、与波形查看器互跳。\n边界（要讲清）：① 它是【SV 语言层面】工具，UVM 靠\"UVM 也是纯 SV 类库\"才能跳转\n② 【没有】DVT 那种 UVM 方法论视图（Sequence/Component 层次、工厂关系图）\n③ 用前【必须配好 .f / +define+ / +incdir+】，否则 UVM 宏解析不了"
 },
 {
  "id": "toolenv-3",
  "note": "notes/仿真工具/环境搭建.md",
  "title": "仿真工具 · 环境搭建",
  "cat": "仿真工具",
  "q": "Vim 的 $HOME 在哪？为什么容易找错？主配置和启用方式是什么？",
  "a": "$HOME = C:\\\\Users\\\\86150\\\\AppData\\\\Roaming\\\\SPB_Data（SPB_Data 环境变量导致），【不是】C:\\\\Users\\\\86150。\n所以用户级 vimfiles 在 SPB_Data\\\\vimfiles\\\\，主配置是 gvimrc_svuvm.vim。\n启用方式：需在 C:\\\\Program Files\\\\Vim\\\\_vimrc 末尾手动加 source 行（该文件需要管理员权限）。\n插件 9 个（verilog_systemverilog.vim / systemverilog.vim / nerdtree / tagbar / vim-airline(+themes) / auto-pairs / vim-commentary / gruvbox）装在 SPB_Data\\\\vimfiles\\\\plugged\\\\。\nVim 无头调试技巧：-u NONE -c \"...\" 下 echo 无输出，改用 -c \"execute 'redir! > file'\" 或写独立脚本用 writefile()。"
 },
 {
  "id": "toolmake-1",
  "note": "notes/仿真工具/Questa命令行与Makefile.md",
  "title": "仿真工具 · Questa 命令行与 Makefile",
  "cat": "仿真工具",
  "q": "vsim -c top -do \"coverage save -onexit c.ucdb; run -all; quit -f\" 这一条命令里叠了几种语言？\n-do 引号里那串是什么语言？",
  "a": "三种：\n① Shell（Git Bash）—— cd、rm -rf、printf ... > r.do、管道\n② 工具命令行选项 —— -work / -sv / -cover bsectf / -coverage / -c / -do，由 vlog / vsim 自己解析\n③ Tcl —— -do 引号里的内容，由 vsim 内嵌的 Tcl 解释器执行\n所以 coverage save -onexit c.ucdb; run -all; quit -f 【是 Tcl】（分号是 Tcl 的命令分隔符，-onexit 是 Questa 命令的选项）。\n（工程化时还有第四层：Makefile 由 make 程序解释。）\nTcl 要点：{ } = 原样字符串（不替换变量）；[ ] = 命令替换。"
 },
 {
  "id": "toolmake-2",
  "note": "notes/仿真工具/Questa命令行与Makefile.md",
  "title": "仿真工具 · Questa 命令行与 Makefile",
  "cat": "仿真工具",
  "q": "TB 里带 $finish 的情况下，想拿到\"跑到 50ns 时的覆盖率快照\"，命令怎么写？为什么能行？",
  "a": "用【限时 run】：\n  -do \"run 50ns; coverage save partA.ucdb; quit -f\"\n因为没跑到 $finish，-do 就会继续往下执行 —— 所以 run 之后的命令能生效。\n对比：跑到底（run -all）时 $finish 会终止 -do 脚本，那时必须用 coverage save -onexit <file> 写在 run 之前。\n（\"跑到某阶段看快照\"就是这个套路。）"
 },
 {
  "id": "toolmake-3",
  "note": "notes/仿真工具/Questa命令行与Makefile.md",
  "title": "仿真工具 · Questa 命令行与 Makefile",
  "cat": "仿真工具",
  "q": "Makefile 的三个坑是什么？\"学 Makefile 最有效的单一技巧\"是什么？",
  "a": "三个坑：\n① 命令行缩进【必须是 TAB】—— 用空格会报 missing separator；自检：awk '/^\\t/' Makefile\n② 【行尾注释会吃掉空格】—— VAR = value   # 注释 会让变量值里带上那串空格（make -n 能看见），拼出来的命令到处是多余空格 → 注释单独放一行\n③ 伪目标没声明 .PHONY —— 目录里恰好有同名文件时目标\"不执行\"\n最有效技巧：【make -n】只打印不执行 —— 想确认自己写对了没，用它当透视镜。\n另外 ?= 是\"没定义才赋值\"（所以命令行传入优先级最高），:= 立即展开，= 延迟展开。\n（覆盖率命令的关键顺序：save 必须在 run 之前 —— 同样是 $finish 吃 -do 那个坑。）"
 },
 {
  "id": "errsilent-1",
  "note": "notes/SV错题本/静默失败类错误.md",
  "title": "错题本 · 静默失败类",
  "cat": "SV错题本",
  "q": "randomize() 失败（返回 0）时，rand 变量的值会变成什么？为什么这个现象特别容易被误判？怎么才能测准？",
  "a": "【保持原值不变，不清零】。\n误判的根源：对象 new() 之后 rand 变量本来就是 0 —— 0 分不清\"被清零\"和\"根本没动\"。\n实测（哨兵值法）：先 p.length = 999，再制造约束冲突 → randomize() 返回 0，但 length 仍是 999。\n所以：① 测这类问题必须先用哨兵值（或先成功随一次）；② 绝不能依赖失败后的取值，只能判返回值。\n同类还有两个：get 失败时变量保持默认值、$cast 失败时目标句柄保持原值（而源为 null 时反而返回 1）。"
 },
 {
  "id": "errsilent-2",
  "note": "notes/SV错题本/静默失败类错误.md",
  "title": "错题本 · 静默失败类",
  "cat": "SV错题本",
  "q": "config_db 的 get 取不到值时会出现什么现象？怎么把这种\"看不见的失败\"变成看得见的？日志要怎么写才算有证据力？",
  "a": "现象：get 返回 0，目标变量【保持默认值】，不报错 —— 看起来像\"取到了，值本来就是默认那个\"。\n三条对策：\n① 判返回值：if (!uvm_config_db#(int)::get(this,\"\",\"cfg_val\",cfg_val)) `uvm_error(\"CFG\",\"cfg_val not found\")\n② 日志里打【值】，不是固定字符串：`uvm_info(\"BUILD\", $sformatf(\"cfg_val = %0d\", cfg_val), UVM_LOW)\n③ 验收标准写成可核对的数字（\"打印出 cfg_val = 42\"），而不是\"有没有那条消息\"。\n取不到的常见原因：set/get 拼出的作用域字符串不一致（实例名 vs 类名）、field_name 写错。"
 },
 {
  "id": "errsilent-3",
  "note": "notes/SV错题本/静默失败类错误.md",
  "title": "错题本 · 静默失败类",
  "cat": "SV错题本",
  "q": "覆盖率报告里某个 covergroup 显示 0.00%，有哪两种完全不同的成因？看到全 0 时第一件事该做什么？",
  "a": "两种成因：\n① 【压根没被采样】：漏 new()、漏 sample()、或者承载它的组件根本没被创建；\n② 【真的没覆盖到】：这次激励打不到那些 bin。\n报告本身不区分二者 —— 所以看到全 0，第一件事是【先确认它有没有被采样】，再谈覆盖够不够。\n区分手段：看日志里有没有采样痕迹；做破坏性实验（把 sample() 注释掉再跑一遍对比）。\n注意两种\"空\"不一样：漏 new() 又去 sample() 是空句柄操作（通常报错/崩），真正【静默】的是\"没人调用 sample()\"或\"组件从未被创建\"。\n另外：rand 动态数组不约束 size 时 randomize() 返回 1 但 size=0，会让长度相关的 bin 全 0 —— 同样是静默失败。"
 },
 {
  "id": "errcode-4",
  "note": "notes/SV错题本/代码书写类错误.md",
  "title": "错题本 · 代码书写类",
  "cat": "SV错题本",
  "q": "默写 UVM 环境时最容易漏的那类\"框架级\"书写错有哪些？（骨架、factory 创建、宏参数、objection 各说一条）",
  "a": "① 骨架不配对：class 没有 endclass、module 没有 endmodule → 后面的类被当成嵌套类，报错位置莫名其妙。五对括号（package/class/covergroup/module/begin）写完立刻配对。\n② factory 创建写成作用域解析的样子：my_com::creat::type_id::(\"my_com\",this) ❌ → 正确三层记法：类名::type_id::create(\"实例名\", parent)。\n③ `uvm_info 少参数：宏要【三个】参数（ID, MSG, VERBOSITY），少参数时编译器报的是宏实参个数问题，不会提示\"你少了消息字符串\"。\n④ objection 当成独立函数：raise_objection(this) ❌ → phase.raise_objection(this) ✅，并与 drop_objection 配对。\n（另：SV 不支持函数重载，同类里同名函数写两遍就是重复定义；运行命令里的顶层名要与模块名一致。）"
 },
 {
  "id": "errstruct-4",
  "note": "notes/SV错题本/结构理解类错误.md",
  "title": "错题本 · 结构理解类",
  "cat": "SV错题本",
  "q": "uvm_config_db 的 set 和 get 要\"三个寻址参数一致\"，这里的\"名字\"到底指什么？类名和实例名分别决定什么？",
  "a": "指的是【实例名】—— create(\"m_comp\", parent) 的第一个参数，它决定组件在层次树里叫什么（uvm_test_top.m_comp）。\n对照：\n· 类名（class my_comp）→ 创建出来是哪【种】对象，也是 factory override 的靶子；\n· 实例名（create 的第 1 个参数）→ 它在层次树里的【位置/名字】；\n· 句柄变量名（my_comp m_comp;）→ 只是你在代码里引用它用的名字，不影响路径。\nconfig_db 拼作用域用的是实例名：set(this,\"m_comp\",…) 在 my_test 里 → \"uvm_test_top.m_comp\"；get(this,\"\",…) 在 my_comp 里 → inst_name 为空 ⇒ 取自己全名 → 同样一串 ✅。\n若两边不一致 → get 静默失败、变量保持默认值。\n另外：前三个参数是\"给谁\"，第四个参数才是\"给什么\"—— 只盯寻址一致，容易忘了检查值本身对不对。"
 },
 {
  "id": "uvmhand-1",
  "note": "notes/UVM/driver与sequence的握手.md",
  "title": "UVM · driver 与 sequence 的握手",
  "cat": "UVM",
  "q": "一次 request/response 的握手里，自己写的代码中只有 4 行会阻塞，分别是哪 4 行？各自卡到什么时候才放行？",
  "a": "① sequence 的 start_item(req)：等 driver 的 get_next_item 来认领；\n② sequence 的 finish_item(req)：等 driver 调 item_done() / item_done(rsp)；\n③ sequence 的 get_response(got)：等 driver 的 item_done(rsp)（driver 不回就永远卡）；\n④ driver 的 get_next_item(req)：等 sequence 的 finish_item 把件送上来。\n除这 4 行以外，其余都是零时间走过去的。\n两边是独立进程，靠这 4 行互相踩刹车 —— 所以日志里 [DRV] 与 [SEQ] 的时间戳一定【交错】出现，不可能各跑各的。\n记忆锚点：这是\"应用者视角\"的路线，先记这 4 个点，再往下看源码。"
 },
 {
  "id": "uvmhand-2",
  "note": "notes/UVM/driver与sequence的握手.md",
  "title": "UVM · driver 与 sequence 的握手",
  "cat": "UVM",
  "q": "get_next_item 和 item_done 内部各自用 fifo 的哪个操作？这个\"分工\"带来哪些推论？",
  "a": "get_next_item 用 m_req_fifo.peek(t) —— 【只看不弹出】；item_done 用 m_req_fifo.try_get(t) —— 【这里才真正弹出】。\n所以它俩是一个 peek/get 对，不是一个函数干一半。\n推论：\n① 一次 get_next_item 必须配一次 item_done，否则队列不清；\n② 忘写 item_done 时，下一次 get_next_item 会先报 \"Get_next_item called twice without item_done or get in between\"，然后因为队首还是那一件，peek 又拿到【同一个 item】；\n③ get() = peek + item_done（一步到位），所以【用了 get 就不能再写 item_done】，否则 try_get 失败 → UVM_FATAL \"Item_done() called with no outstanding requests\"。\n另一个后果：peek 返回的是句柄不是副本，在 driver 里改 req.xxx 会改到 sequence 手里同一个对象。"
 },
 {
  "id": "uvmhand-3",
  "note": "notes/UVM/driver与sequence的握手.md",
  "title": "UVM · driver 与 sequence 的握手",
  "cat": "UVM",
  "q": "start_item 的 item 参数能不能省？finish_item 为什么必须传同一个 req？",
  "a": "不 能省。签名是 start_item(uvm_sequence_item item, int set_priority = -1, uvm_sequencer_base sequencer = null)，item 【没有默认值】，写 start_item() 直接编译报错；能省的只有后两个参数，start_item(req) 等价于 start_item(req, -1, null)。\n必须同一个 req 的原因：\n· start_item 内部做了 item.set_item_context(this, sequencer)，把\"发件人\"和目的地记在 item 上；\n· finish_item 开头是 sequencer = item.get_sequencer()，从 item 上把 sequencer 取回来。\n传两个不同对象 → 第二个从没 set_item_context 过 → get_sequencer() 得到 null → UVM_FATAL \"STRITM sequence_item has null sequencer\"。\n还有一条更重要的：item 决定【回信回给谁】—— put_response 靠 item 上的 sequence_id 找回原 sequence，所以 rsp 必须 set_id_info(req)，否则报 [SQRPUT] null sequence_id。\n补充：item 还是最终被 driver 取走的那件东西（send_request 直接把它 put 进 fifo）。"
 },
 {
  "id": "uvmhand-4",
  "note": "notes/UVM/driver与sequence的握手.md",
  "title": "UVM · driver 与 sequence 的握手",
  "cat": "UVM",
  "q": "driver 忘了写 item_done()，仿真会是什么现象？为什么看起来\"没死\"？",
  "a": "仿真【永不结束】—— run -all 跑不完，只能超时 kill 或 Ctrl+C。\n实测表现：\n· sequence 只打印 1 次就卡死在 finish_item（内部的 wait_for_item_done 等不到唤醒）；\n· driver 反而在\"空转同一件 item\" —— 因为 get_next_item 用的是 peek，从不弹出，所以每轮拿到的都是同一件；\n· 同时狂刷 \"Get_next_item called twice without item_done or get in between\"。\n为什么看起来\"没死\"：driver 里的 #10 仍在推进仿真时间，所以时间在走、日志在刷，只是永远结束不了。\n关键认知：真正停摆的是 【sequence】，driver 侧是在空转。\n排查手段：在 forever 内外两侧打 $display 时间戳（标签用纯 ASCII）。"
 },
 {
  "id": "force-1",
  "note": "notes/SystemVerilog/force与侵入式赋值.md",
  "title": "SV · force 与侵入式赋值",
  "cat": "SystemVerilog",
  "q": "force 期间，设计自己对这个信号的驱动还有效吗？日志上会看到什么？",
  "a": "完全无效 —— 设计侧的驱动被盖住，只有 TB 的 force 说了算。\n实测：设计里 rkv_mod 本来每 5ns 让 out_p0 加 1（0、1、2、3…），被 force 到接口的 d0 之后，日志全是 TB 灌的值 1、2、4、8。\n另一个观察：m0.out_p0 就是 m1.in_p0（同一根线），所以 force 一处会\"顺带\"改掉下游模块的输入 —— 这就是\"侵入式\"的传染效果。\n驱动权直到 release 才会还给设计。"
 },
 {
  "id": "force-2",
  "note": "notes/SystemVerilog/force与侵入式赋值.md",
  "title": "SV · force 与侵入式赋值",
  "cat": "SystemVerilog",
  "q": "`force sig = src;` 只执行了一次，之后 src 变了，sig 会跟着变吗？为什么？",
  "a": "会跟着变。\nforce 的学名是【过程性连续赋值】（procedural continuous assignment）：force 生效期间，目标变量由这条赋值【持续】驱动，右侧表达式一变它就更新，不需要重新执行 force。\n实测：`initial #1 force sig = src;` 只执行一次，t=17 时 sig 已经跟着 src 涨到 3。\n推论：把 force 放进 always_comb 里，和\"只执行一次\"，输出逐行一致 —— always_comb 不是必需的。\n只有 `release` 才把驱动权还回去。"
 },
 {
  "id": "force-3",
  "note": "notes/SystemVerilog/force与侵入式赋值.md",
  "title": "SV · force 与侵入式赋值",
  "cat": "SystemVerilog",
  "q": "force / freeze / deposit 三者在\"驱动权\"上有什么不同？",
  "a": "· `force lhs = expr;`（SV 语句）——长期占用，右侧变化自动跟随，直到 release；\n· VCS 命令 `force -freeze` ——长期冻结，等价于\"永不 release\"；\n· VCS 命令 `force -deposit` ——只灌一次值，之后设计仍可驱动它。\n书里那个例子【没有写 release】→ 设计永远拿不回驱动权，属于最坏情形。"
 },
 {
  "id": "force-4",
  "note": "notes/SystemVerilog/force与侵入式赋值.md",
  "title": "SV · force 与侵入式赋值",
  "cat": "SystemVerilog",
  "q": "用 force 调试时，收尾最容易忘什么？为什么危险？",
  "a": "最容易忘 `release`。\n后果一：驱动权不归还 —— 该信号（及其下游）永远由 TB 说了算，后面所有用例都被污染。\n后果二：force 期间设计的逻辑\"沉默\"，【协议检查、覆盖率、时序关系全部失真】，所以不能长期挂着跑回归。\n另外两个坑：跨层次路径名（top.m0.out_p0）依赖层次结构，改名/工具优化后会失效（工程上配合 bind 或统一层次引用管理）；对时钟、复位 force 要格外小心，可能造出物理上不可能的时序。\n（附带：书上代码 `task drive(ref ...)` 在本机 Questa 编不过，ref 形参必须 automatic。）"
 },
 {
  "id": "configlib-1",
  "note": "notes/仿真工具/Verilog-config与库绑定.md",
  "title": "仿真工具 · Verilog config 与库绑定",
  "cat": "仿真工具",
  "q": "同一个模块名在 work 和 tblib 两个库里各有实现，跑仿真时凭什么决定用哪一个？",
  "a": "靠 Verilog 的 config（配置声明）—— 它就是\"库绑定的裁决书\"。\n三个子句分工：`design work.top;` 指定管辖的顶层；`default liblist work;` 给默认的库搜索列表（顺序=优先级）；`instance <层次路径> liblist tblib;` 给某个实例的特例绑定。\n实测：`vsim -c cfg1` → This is m2（全从 work 取）；`vsim -c cfg2` → This is dummy m2（只有 top.m1_inst.m2_inst 改从 tblib 取）。同一份编译结果、源码一行不改。"
 },
 {
  "id": "configlib-2",
  "note": "notes/仿真工具/Verilog-config与库绑定.md",
  "title": "仿真工具 · Verilog config 与库绑定",
  "cat": "仿真工具",
  "q": "config 里的 `design work.top;` 和 `default liblist work;` 分别管什么？",
  "a": "`design <库名>.<单元名>` —— 【管谁】：这份配置适用于哪个顶层设计（注意它不是\"从哪取模块\"）。\n`default liblist <库...>` —— 【默认去哪找】：顶层树里所有没被单独指定的实例，都按这个列表的顺序去库里搜同名模块。\n只写这两句的配置，作用就是\"把整棵树的模块解析固定在一个库\"（cfg1 就是这种）。\n此外还有 `instance <层次路径> liblist`（按实例覆盖）与 `cell <模块名> liblist`（按模块类型覆盖）。"
 },
 {
  "id": "configlib-3",
  "note": "notes/仿真工具/Verilog-config与库绑定.md",
  "title": "仿真工具 · Verilog config 与库绑定",
  "cat": "仿真工具",
  "q": "Verilog config 和 UVM factory override 都是\"换实现\"，区别在哪？",
  "a": "换的对象和时机不同：\n· UVM factory override：换【验证组件】的实现，在【运行期】生效（create 时查表，所以必须在 create 之前设置）；\n· Verilog config：换【设计模块】的实现（从哪个库取同名模块），在【编译/链接期】生效，运行时改不了。\n两者是同一思路在两个层次上的对应物：TB 侧用 factory，设计侧用 config。\n前提：两份实现【模块名相同、端口/参数兼容】，否则链接时报端口不匹配。\n（小工程只有一份源码时，一辈子用不到 config。）"
 },
 {
  "id": "phasejmp-1",
  "note": "notes/UVM/相位与域.md",
  "title": "UVM · 相位与域",
  "cat": "UVM",
  "q": "写 reset 跳转时，`main_phase` 里为什么要用 `fork ... join_any` + `disable fork`？",
  "a": "为了让【主激励】和【盯 reset / 发起跳转】并行，同时又能在跳转时干净收场。\n· fork 出两条线程：① repeat(3) 的正常激励；② 满足条件时调用 phase.jump(uvm_reset_phase::get())；\n· join_any：任一分支结束就继续（不等另一条）；\n· disable fork：★ 把另一条还在跑的线程掐掉 —— 否则它会继续持 objection、继续打激励，跳转后行为就乱了。\n另外：jump 是域级操作，只应由【一个】协调者（专门的 reset 监听组件）发起，多个组件同时调会重复触发。\n实测（ts_sim/tb_phase_jump.sv）：两轮 reset→configure→main，一次 [PH_JUMP]，0 error 0 fatal；代码里 #1ns 在 jump 之前，那 1ns 是代码自己的等待，不是 jump 的延迟。"
 },
 {
 "id": "mstidx-1",
 "note": "notes/基础面试题目/索引与答题策略.md",
 "title": "面试题 · 索引与答题策略",
 "cat": "基础面试题目",
 "q": "面试答题的四段式是什么？为什么不能只给结论？",
 "a": "① 先给结论（一句话，面试官问的就是这个）；② 再讲机制（\"为什么这样设计\"，体现理解原理不是背答案）；③ 补代码/表格（关键 3~5 行，别写一整页）；④ 最后补边界条件或坑（这步最能加分）。\n只给结论会被判定为\"背的\"；第 2 段证明你有体系认知；第 4 段往往才是拉开差距的地方。\n例：问 m_sequencer vs p_sequencer，只答\"p_sequencer 是宏声明的\"是背；答完类型/为什么不能直接访问/宏替你干了什么/转型失败要主动报错，才是懂。"
},
 {
 "id": "mstidx-2",
 "note": "notes/基础面试题目/索引与答题策略.md",
 "title": "面试题 · 索引与答题策略",
 "cat": "基础面试题目",
 "q": "这套题库的推荐刷题顺序是什么？为什么把 UVM 那几篇放在最前？",
 "a": "① UVM 平台与组件 → factory 与配置 → 相位与 objection → TLM 通信（先建\"平台怎么搭起来\"的框架，必须先通）；\n② UVM 序列与仲裁 + 寄存器模型 RAL（最大考点，实际工作中最常问）；\n③ SV 语言基础 + 覆盖率与断言（题最多、最易踩坑，务必自己敲一遍代码）；\n④ 数字电路与时序设计 + 总线协议（验证岗硬骨头，答不上来显得基础薄）；\n⑤ 项目与综合面 + 验证方法与流程（必须结合自己项目改写，纯背没用）。\n★ 项目类放最后是有意的：前四轮是\"能不能答\"，最后一轮是\"答得像不像你做过\"，前面没建立框架时背项目话术没有说服力。"
},
 {
 "id": "mstidx-3",
 "note": "notes/基础面试题目/索引与答题策略.md",
 "title": "面试题 · 索引与答题策略",
 "cat": "基础面试题目",
 "q": "三类面试题（概念辨析 / 流程机制 / 项目软性）分别该怎么准备？",
 "a": "· 概念辨析题（component vs object、get vs try_get、浅拷贝 vs 深拷贝）：做成【对比表】，只记差异项，不要背整段。\n· 流程机制题（握手、仲裁、build_phase 例化、RAL 集成）：记【步骤顺序】，要能默画出流程图，答时按 1-2-3 编号说。\n· 项目软性题（环境怎么搭、为什么转行）：写成【自己的话】，必须有具体数字（覆盖率 %、agent 数、发现几个 bug）和真实细节，纯背一眼就穿。\n判断标准：概念题答错是\"知识缺口\"，流程题答错是\"没理解\"，项目题答错是\"没参与\"。"
},
 {
 "id": "mstplat-1",
 "note": "notes/基础面试题目/UVM平台与组件.md",
 "title": "面试题 · UVM 平台与组件",
 "cat": "基础面试题目",
 "q": "component 比 object 多出来的两点是什么？怎么快速判断一个 UVM 类属于哪一类？",
 "a": "多出来的两点：① new 时指定 parent 参数，形成【树形结构】；② 有【phase 自动执行】机制。\n快速判断：有没有 phase 回调 / 能不能 new 出父子层次 → 是 component。\n· component：driver、monitor、sequencer、agent、scoreboard、reference model、test、env、phase\n· object：item/transaction、sequence、config、map、field、reg\n★ 最容易记混的是 phase 和 reg —— 它们是 object，不是 component。"
},
 {
 "id": "mstplat-2",
 "note": "notes/基础面试题目/UVM平台与组件.md",
 "title": "面试题 · UVM 平台与组件",
 "cat": "基础面试题目",
 "q": "为什么必须有 monitor？直接让 driver 把数据发给 scoreboard 不行吗？",
 "a": "两条理由，缺一条就丢分：\n① 协议理解分工：大型项目里 driver 按协议【发】、monitor 按同一协议【收】，若是不同人实现，能大幅减少任一方对协议理解的错误。\n② 代码复用：agent 被集成时某些场景只需要监测不需要激励（挂在输出端口上），配 is_active=UVM_PASSIVE 即可只例化 monitor —— 同一套 VIP 才能从模块级复用到 SoC 级。"
},
 {
 "id": "mstplat-3",
 "note": "notes/基础面试题目/UVM平台与组件.md",
 "title": "面试题 · UVM 平台与组件",
 "cat": "基础面试题目",
 "q": "为什么必须在 build_phase 例化 component？如果在 new() 里例化会发生什么？",
 "a": "因为 build_phase 是【top-down】：高层 env 的 build_phase 先跑，高层配置好之后低层才能建。所以低层 agent 在自己的 build_phase 里能直接 get() 到上层设的 is_active。\n若在 new() 里例化：new() 是在 type_id::create() 那一刻调用的，此时 env 的 build_phase 还没给 is_active 赋值 → 读到【默认值 UVM_ACTIVE】，配置完全失效。\n补救：改用 config_db 在 env.build_phase 里提前 set，再在 agent.new() 里 get。\n规律：component 一般在 build_phase 例化；object 可以在任何 phase 例化。"
},
 {
 "id": "mstfac-1",
 "note": "notes/基础面试题目/factory与配置机制.md",
 "title": "面试题 · factory 与配置机制",
 "cat": "基础面试题目",
 "q": "factory 覆盖（override）成立的三个条件是什么？覆盖类能不能是原始类的父类？",
 "a": "三个条件：① 原始类和覆盖类都必须在 factory 注册；② 原始类必须用 type_id::create() 实例化（不能 new()）；③ 覆盖方法必须在原始类对象【创建之前】调用。\n另外两条补充：覆盖类必须是原始类的【子类】，且被调方法在原始类里声明为 virtual（否则句柄转换会出错）。\n★ 覆盖类为原始类的【父类时会报错】—— 派生关系方向记牢：子类覆盖父类，不能反过来。"
},
 {
 "id": "mstfac-2",
 "note": "notes/基础面试题目/factory与配置机制.md",
 "title": "面试题 · factory 与配置机制",
 "cat": "基础面试题目",
 "q": "uvm_config_db 和 uvm_resource_db 的核心区别是什么？\"parent wins\" 是什么优先级规则？",
 "a": "config_db 继承自 resource_db。核心区别在同一条配置有多条写入时谁生效：\n· uvm_resource_db：last write wins，与层次无关。build_phase 自顶向下，低层次写入发生在最后 → 低层次反而成为有效数据，无法实现层次化覆盖，不利于集成复用。\n· uvm_config_db：parent wins（最高层次有效），同一层次内后写入有效。\n★ 具体优先级是 1000 - cntxt.get_depth()，取【数值最大】者 → 越靠近根越优先；同优先级时是【最后写的先】。\n附加：config_db 还支持 set_scope 通配（* ? .），resource_db 不支持。"
},
 {
 "id": "mstfac-3",
 "note": "notes/基础面试题目/factory与配置机制.md",
 "title": "面试题 · factory 与配置机制",
 "cat": "基础面试题目",
 "q": "callback 和 factory override 都能\"改变组件行为\"，本质区别是什么？",
 "a": "· factory override：【产生一个新的扩展类】替换原对象，对象类型变了。\n· callback：类还是原先的类，只是【类内部的 callback 函数】变了。\ncallback 使用四步：① 在组件中内嵌 callback 函数/任务；② 声明一个 uvm_callback 空壳类；③ 扩展空壳类；④ 用 uvm_register_cb 登记实例。\n典型用途：在 driver 把激励发到 DUT 之前注入错误（如翻转 CRC 的一位），而不改 driver 本身 —— 这是构造异常测试用例最干净的办法。"
},
 {
 "id": "mstseq-1",
 "note": "notes/基础面试题目/UVM序列与仲裁.md",
 "title": "面试题 · UVM 序列与仲裁",
 "cat": "基础面试题目",
 "q": "为什么 start_item 和 finish_item 之间绝对不能加延迟？",
 "a": "start_item 返回后，这个 sequence 就【赢得了仲裁】，可以访问 sequencer/driver。从那时到 finish_item 之间的任何延迟，都会让 sequencer/driver 【空转被占住】，不能被其他 sequence 使用。\n后果：其他 sequence 拿不到 driver，这个时间片全被浪费；在多 sequence 竞争时可能直接掩盖 bug 或造成超时。\n正确做法：把耗时逻辑放在 body() 里 start_item 之前，或者在 driver 侧用 fork...join_none 做流水线（pipeline）模式，而不是靠 body 里 delay 来错开。"
},
 {
 "id": "mstseq-2",
 "note": "notes/基础面试题目/UVM序列与仲裁.md",
 "title": "面试题 · UVM 序列与仲裁",
 "cat": "基础面试题目",
 "q": "get() 和 get_next_item() 都能从 sequencer 拿 item，区别是什么？哪个需要 item_done()？",
 "a": "· get()：阻塞、隐式完成握手 → 【不需要】显式调 item_done()。\n· get_next_item()：阻塞，取到后必须【显式】调 item_done() 才完成握手。\n· try_next_item()：非阻塞，没有可用 item 时返回空指针，成功后要 item_done()。\n· try_get()：非阻塞，同样隐式握手不用 item_done。\n· peek()：阻塞但【不消费】，只是复制一份。\n· put()：非阻塞。\n★ 面试常直接问\"下面哪段代码是错的\" —— 典型错法是在 item_done() 之前调了两次 get_next_item()，握手完不成。"
},
 {
 "id": "mstseq-3",
 "note": "notes/基础面试题目/UVM序列与仲裁.md",
 "title": "面试题 · UVM 序列与仲裁",
 "cat": "基础面试题目",
 "q": "lock() 和 grab() 都能让 sequence 独占 sequencer，区别是什么？",
 "a": "区别在于【请求放进仲裁队列的位置】：\n· lock()：请求和其他 sequence 的 transaction 请求【一起放到队列末尾】，等到它时前面的请求都已结束；拿到后 sequencer 一直发它的 item，直到 unlock()。是【阻塞】调用，要等更高优先级的 sequence 让路。\n· grab()：请求直接插到队列【最前面】，一发出就拥有所有权，【不考虑其他 sequence 的优先级】（除非已有人 lock/grab 了）。\n适用场景：施加一段定向激励，中途不能被打断（独占到所有 item 发完）。"
},
 {
 "id": "mstseq-4",
 "note": "notes/基础面试题目/UVM序列与仲裁.md",
 "title": "面试题 · UVM 序列与仲裁",
 "cat": "基础面试题目",
 "q": "m_sequencer 和 p_sequencer 有什么区别？为什么需要 p_sequencer？",
 "a": "· m_sequencer：sequence 的【成员变量】，类型 uvm_sequencer_base。sequence 挂到 sequencer 上时该句柄被赋值（向上转型，所以类型是父类）。\n问题：通过它【不能直接用】具体 sequencer 子类里定义的变量，编译报错，必须先 $cast 向下转型。\n· p_sequencer：用 `uvm_declare_p_sequencer(我的sequencer类) 宏声明的成员变量，指向指定子类类型，宏【自动完成 cast】，因此可以自由访问子类成员。\n★ 坑：手写 cast 时转型失败要主动 `uvm_fatal 报错，否则运行期是空 p_sequencer，访问成员时空引用崩掉。"
},
 {
 "id": "msttlm-1",
 "note": "notes/基础面试题目/TLM通信与端口.md",
 "title": "面试题 · TLM 通信与端口",
 "cat": "基础面试题目",
 "q": "TLM 的 port / export / imp 有什么区别？能不能用 create() 创建？",
 "a": "· port：通信请求的【发起端】\n· export：介于 port 与 imp 之间的中间层\n· imp：只能作为【接受请求的响应端】，无法扩展连接\n优先级 port > export > imp，只有优先级高的才能调 connect()：port 可连 export/imp，export 可连 export/imp，imp 是终点。\n★ 这三种端口【不是 uvm_component 的子类】，所以要用 new() 创建，【不能用 create()】（create 是 factory 的东西，只有注册过的 component/object 才用）。\n典型：driver.seq_item_port.connect(sequencer.seq_item_export)"
},
 {
 "id": "msttlm-2",
 "note": "notes/基础面试题目/TLM通信与端口.md",
 "title": "面试题 · TLM 通信与端口",
 "cat": "基础面试题目",
 "q": "scoreboard 要同时接 monitor 和 reference model 的数据，就得定义两个 write，方法名怎么不冲突？",
 "a": "两种解法：\n① 宏声明带后缀的端口：`uvm_analysis_imp_decl(_monitor) / (_model) → 生成 uvm_analysis_imp_monitor / _model，对应 write_monitor() / write_model()，方法名自然不同。\n② 【更常用】改用 uvm_tlm_analysis_fifo：它本质 = 一块缓存 + 两个 imp，自带 analysis_imp 端口和 write 函数。monitor 连 analysis_port 侧，scb 用 blocking_get_port 主动取。这样【scoreboard 里完全不用写 write 函数】，还顺带解决了两个来源数据撞在一起的处理问题。"
},
 {
 "id": "msttlm-3",
 "note": "notes/基础面试题目/TLM通信与端口.md",
 "title": "面试题 · TLM 通信与端口",
 "cat": "基础面试题目",
 "q": "analysis_port 和 TLM port 的区别是什么？各自的典型使用场景？",
 "a": "· TLM port / TLM FIFO：两个组件之间的【一对一】事务通信，用 put/get 建立通道。典型：driver ↔ sequencer。\n· analysis port / analysis FIFO：组件把事务【广播】到多个组件。典型：monitor → scoreboard / reference model。\nanalysis_port 的特点：可以不连接，也可连一个或多个 analysis_imp；【没有阻塞/非阻塞之分】；在 analysis_imp 所在 component 里必须定义一个 write 函数。\n记忆：一对一 → TLM port；一对多广播 → analysis port。"
},
 {
 "id": "mstphs-1",
 "note": "notes/基础面试题目/UVM相位与objection.md",
 "title": "面试题 · UVM 相位与 objection",
 "cat": "基础面试题目",
 "q": "哪些 phase 是 top-down、bottom-up、parallel？为什么 build_phase 是 top-down？",
 "a": "· build_phase：【top-down】自上而下\n· run_phase 等 task phase：【parallel】并行\n· 其余 function phase：【bottom-up】自下而上\n原因：低层组件要在高层组件的 build_phase 里被【例化】。如果高层的 build_phase 之前就执行 driver 的 build_phase，那时 driver 还没被例化，调用它的 build_phase 会报错。\nconnect_phase 是 bottom-up，因为它要在 build_phase 之后完成组件之间 TLM 连接，先把底层端口准备好。\n另外：兄弟关系的 component 的相同 phase 之间按【字典序】执行。"
},
 {
 "id": "mstphs-2",
 "note": "notes/基础面试题目/UVM相位与objection.md",
 "title": "面试题 · UVM 相位与 objection",
 "cat": "基础面试题目",
 "q": "如果某个 phase 一个 objection 都没 raise，会发生什么？raise_objection 应该写在哪？",
 "a": "· 一个 objection 都没提 → UVM 【直接跳到下一个 phase】，不是死等。这个行为很多人理解反了。\n· 都撤销了（计数从非零变零，\"all dropped\"）→ 关闭此 phase；所有 phase 执行完毕后调 $finish 关闭整个平台。\nraise_objection 的位置：必须在 main_phase 中【第一个消耗仿真时间的语句之前】。\n判断是否消耗时间：$display 不消耗时间；@(posedge clk)、#10ns、wait() 才消耗。"
},
 {
 "id": "mstphs-3",
 "note": "notes/基础面试题目/UVM相位与objection.md",
 "title": "面试题 · UVM 相位与 objection",
 "cat": "基础面试题目",
 "q": "为什么需要 set_drain_time？它和 set_global_timeout 有什么不同？",
 "a": "set_drain_time 解决【丢包】：DUT 处理数据需要时间，如果 sequence 发完最后一个 transaction 就 drop_objection，t 时刻之后 DUT 输出的包就【收不到了】。设了 drain_time 后，UVM 检测到所有 objection 撤销时，会先延迟 drain_time 再进 post_main_phase。\nset_global_timeout 解决【挂死】：把 uvm_top.phase_timeout 设为超时值，若 run_phase 在该超时前没结束就停止并报错。\nset_timeout 解决【死锁但时间还在走】：时间在消耗但进度停滞（如事件等不到、get 从空 mailbox 拿），超时给 uvm_fatal 并退出。\n记忆：drain_time 兜【尾部数据】，timeout 兜【时间不收敛】。"
},
 {
 "id": "mstal-1",
 "note": "notes/基础面试题目/寄存器模型RAL.md",
 "title": "面试题 · 寄存器模型 RAL",
 "cat": "基础面试题目",
 "q": "update() 和 mirror() 方向分别是哪一边？为什么要有这两个方法？",
 "a": "方向相反：\n· update()：把模型中的【期望值更新到 DUT】。先检查期望值与镜像值，不等则写入 DUT 并更新镜像值。\n· mirror()：【从 DUT 读取】寄存器值，检查与镜像值是否一致，不一致报错；再调 predict() 更新镜像值。\n为什么都要：update 用来【主动配置】DUT（保证 DUT 是我期望的状态），mirror 用来【被动确认】DUT 真实状态是不是模型以为的那样（发现别人偷偷改了寄存器）。\n另一个常用组合：先用 set() 设好期望值，再调 update() —— update 发现期望值≠镜像值时自动写入并同步。"
},
 {
 "id": "mstal-2",
 "note": "notes/基础面试题目/寄存器模型RAL.md",
 "title": "面试题 · 寄存器模型 RAL",
 "cat": "基础面试题目",
 "q": "前门访问和后门访问的四个区别？什么 bug 只能用后门访问才能测出来？",
 "a": "① 通路：前门要经【配置寄存器总线】；后门直接读写 DUT 内部寄存器，不经总线。\n② 时间：前门【消耗】仿真时间，后门不消耗。\n③ 只读寄存器：前门无法写，后门【可以】写进去。\n④ 波形可见性：前门操作在波形里【都有记录】；后门【找不到】，只能靠打印信息 → 增加调试难度。\n典型只有后门能测出的 bug：【寄存器地址映射错误】（如 A 的地址本该 0x10 实际映射到 0x20，B 反之）—— 单纯先写再读检测不出来。做法：前门配 A → 后门读 HDL 地址映射处的 A 变量看是否改变 → 再前门读 A 比对。"
},
 {
 "id": "mstal-3",
 "note": "notes/基础面试题目/寄存器模型RAL.md",
 "title": "面试题 · 寄存器模型 RAL",
 "cat": "基础面试题目",
 "q": "集成寄存器模型时 build_phase 里那四步是什么？忘了会怎样？",
 "a": "在 base_test 里依次调用：\n① rm.configure(...) —— 配置\n② rm.build(...) —— 例化所有寄存器\n③ rm.lock_model() —— 调用后寄存器模型中【不能再加入新的寄存器】\n④ rm.reset() —— 把所有寄存器的值设为复位值\n另外在 base_test 的 connect_phase 里，要用 set_sequencer() 把 adapter 和 bus_sequencer 告知 default_map，并把 default_map 设为自动猜测状态，不做这步前门访问跑不起来。\n★ 最常忘的是 ③ lock_model 的位置——放太早（还没例化完）会出问题，放太晚（后面还想加寄存器）就加不进去了。"
},
 {
 "id": "mstsv-1",
 "note": "notes/基础面试题目/SV语言基础.md",
 "title": "面试题 · SV 语言基础",
 "cat": "基础面试题目",
 "q": "合并数组和非合并数组怎么区分？哪个在内存里连续？",
 "a": "看维度写在【类型后面】还是【名字后面】：\n· 合并数组（packed）：bit[7:0] array[3:0] —— 定义在【类型后面、名字前面】，存储【连续】。32 位存不满不会另开空间。\n· 非合并数组（unpacked）：bit[7:0][3:0] array —— 定义在【名字后面】，存储【不连续】。每个元素单独占一段，即使某元素没被使用也会开辟空间。\n（标准叫法是 packed array / unpacked array，中文教材常叫合并/非合并。）"
},
 {
 "id": "mstsv-2",
 "note": "notes/基础面试题目/SV语言基础.md",
 "title": "面试题 · SV 语言基础",
 "cat": "基础面试题目",
 "q": "$cast 查的是句柄类型还是对象类型？什么时候向下转型会失败？",
 "a": "$cast 查的是【对象类型】。\n向上（子类句柄→父类句柄）：直接赋值【可以】，$cast 反倒会报错（父类句柄与子类句柄指向的是不同对象）。\n向下（父类句柄→子类句柄）：直接赋值和 $cast 都【不行】，因为 bc 真实对象是 base 不是 sub。只有【父类句柄指向子类对象】时，$cast 才成功：\n  sub_class s3 = new(); base_class bc2 = s3;  // 向上转型\n  $cast(s3, bc2);                          // ✓ 成功\n为什么向下要严查：子类比父类有更多属性，父类内存里根本没划那些空间，硬转会内存溢出。"
},
 {
 "id": "mstsv-3",
 "note": "notes/基础面试题目/SV语言基础.md",
 "title": "面试题 · SV 语言基础",
 "cat": "基础面试题目",
 "q": "@ 和 wait() 的区别是什么？为什么同一 time slot 里 @ 和 -> 会竞争？",
 "a": "· 触发敏感性：wait() 是【电平敏感】（括号里为 1 就触发）；@ 是【边沿敏感】（0→1 / 1→0 才触发）。\n· 次数：wait 只等【一次】；@ 每时每刻都在等。\n· 竞争：@ 会阻塞进程直到事件被 -> 触发才 unblock。如果 ->event 和 @event 发生在【同一个 time slot】，无法确定谁先执行 → 竞争冒险。\n解法：用 wait(event.triggered) —— event 的 triggered 属性持续【一个 time slot】，因此只要 wait 在同一 time slot 或之前执行就能等到。\n口诀：用 @ 搭配 -> 时必须先 @ 再 ->；用 wait 搭配时谁先谁后都可以。"
},
 {
 "id": "mstsv-4",
 "note": "notes/基础面试题目/SV语言基础.md",
 "title": "面试题 · SV 语言基础",
 "cat": "基础面试题目",
 "q": "function 和 task 有什么区别？（最容易答漏的一条是什么）",
 "a": "① 互相调用：function 能调 function 但【不能调 task】；task 能调 task 也能调 function。\n② 执行时刻：function 总在【仿真 0 时刻】开始执行，task 可在非零时刻。\n③ 时序控制：function 【一定不能】含延迟、事件或时序控制语句；task 可以。\n④ 变量：function 至少一个 input，【不能有 output/inout】；task 可有多个 input/output/inout。\n⑤ 返回值：function 只返回一个值；task 不返回值，通过 output/inout 传多个。\n★ 最容易漏答的是第 ③ 条（不能有时序控制）—— 面试官常专门追这一句。"
},
 {
 "id": "mstsv-5",
 "note": "notes/基础面试题目/SV语言基础.md",
 "title": "面试题 · SV 语言基础",
 "cat": "基础面试题目",
 "q": "logic 和 wire 到底什么时候用？为什么 inout 端口不能定义成 logic？",
 "a": "结论：【单驱动用 logic，多驱动用 wire。】\n· logic 是 reg 的改进：既能过程赋值也能连续赋值，编译器自动推断它是 reg 还是 wire。\n· logic 只允许【一个驱动】，不能多重驱动；如果接收了多个驱动，用 logic 【编译时就报错】。\n· inout 端口天然是多驱动（外部和内部都要驱动），所以不能定义为 logic。\n· 多驱动时用 wire（net 类型）。\n★ 答不出这条的，面试官会认为没写过真正能编译的多驱动 testbench。"
},
 {
 "id": "mstcov-1",
 "note": "notes/基础面试题目/覆盖率与断言.md",
 "title": "面试题 · 覆盖率与断言",
 "cat": "基础面试题目",
 "q": "代码覆盖率低但功能覆盖率高，可能是什么原因？反过来呢？",
 "a": "代码低 + 功能高：\n· A、covergroup 写得不完备，测试点分解也可能不完备\n· B、DUT 中有大量冗余代码\n代码高 + 功能低：\n· A、功能覆盖率的【采样有问题】——相关场景都打到了，但 covergroup 没采样到\n· B、covergroup 中的 cross bin 或 corner 点没覆盖到\n提高手段：新增约束 / 添加测试用例 / 用不同种子跑现有用例。覆盖率收集是【迭代过程】，要反复跑。"
},
 {
 "id": "mstcov-2",
 "note": "notes/基础面试题目/覆盖率与断言.md",
 "title": "面试题 · 覆盖率与断言",
 "cat": "基础面试题目",
 "q": "ignore_bins 和 illegal_bins 有什么区别？采样到 illegal_bins 会怎样？",
 "a": "· ignore_bins：忽略采样到的 bin，【不计入统计】（分母里没有它）。用来处理不可能/无意义的取值，免得白拉低覆盖率。\n· illegal_bins：如果采样到了这个非法 bin，仿真【会报 error】。用来断言\"这个值绝对不能出现\"。\n相关：binssof ... intersect 与 binsof 一般【与 intersect 连用】，构成 binsof(x) intersect(y)，表示覆盖点 x 与给定表达式 y 的交集，常用于 cross 筛选。\n★ 误区：ignore_bins 命中【不会】报错，报错的是 illegal_bins。"
},
 {
 "id": "mstdc-1",
 "note": "notes/基础面试题目/数字电路与时序设计.md",
 "title": "面试题 · 数字电路与时序设计",
 "cat": "基础面试题目",
 "q": "多 bit 信号能跨时钟域打两拍吗？为什么？",
 "a": "不能。只有【单 bit】信号能打两拍。\n原因：多 bit 数据的各个 bit 之间【路径延迟不一样】。源时钟域给的是 2'b11，目的时钟域采样到可能只有 2'b10（其中一个 bit 的延迟没赶上），打两拍也没法对齐和判断哪个是对的值。\n多 bit 的正确做法：格雷码（相邻只变 1 bit，但要求取值范围是满 2^n，如 3 bit 必须 0~7）、异步 FIFO、握手（DMX：用源域单 bit 信号判断是否已在目的域同步成功，成功则这段时间内多 bit 也能同步过来）、显式握手协议。"
},
 {
 "id": "mstdc-2",
 "note": "notes/基础面试题目/数字电路与时序设计.md",
 "title": "面试题 · 数字电路与时序设计",
 "cat": "基础面试题目",
 "q": "阻塞赋值和非阻塞赋值的区别？为什么这么规定？",
 "a": "· 阻塞 =：必须阻塞赋值完成后才执行下一条；赋值一旦完成左边【立即变化】；同一块中书写顺序【影响】结果；【硬件没有对应电路】。\n· 非阻塞 <=：赋值开始时算右边，【本仿真周期结束时】才更新左边；【不是立即生效】，允许块中其他语句同时执行；同一块中书写顺序【不影响】结果；【硬件有对应电路】。\n记忆：阻塞 = 串行 + 立即生效；非阻塞 = 并行 + 同时执行。\n规范：【组合逻辑用阻塞，时序逻辑用非阻塞】。答反了直接扣分——因为时序逻辑用阻塞会在时钟沿前后产生仿真与真实硬件不一致的竞争。"
},
 {
 "id": "mstdc-3",
 "note": "notes/基础面试题目/数字电路与时序设计.md",
 "title": "面试题 · 数字电路与时序设计",
 "cat": "基础面试题目",
 "q": "异步复位有什么缺点？推荐的工程方案是什么？",
 "a": "异步复位（always@(posedge CLK or negedge Rst_n)）的缺点：① 复位信号容易受毛刺干扰；② 【若复位释放刚好在时钟有效沿附近，寄存器输出很容易出现亚稳态】。\n推荐的工程方案：【异步复位、同步释放】—— 复位【到来】时不与时钟同步（保留异步复位响应快的优点），但复位【释放】时与时钟同步（避开亚稳态窗口）。\n另外要说清相关术语：恢复时间（recovery，撤销复位时非复位状态必须在时钟沿【之前】达到）和移除时间（removal，撤销复位后还要保持的时间）。\n★ 只答\"异步复位设计简单、省资源\"而不说亚稳态缺点，是不完整的答案。"
},
 {
 "id": "mstdc-4",
 "note": "notes/基础面试题目/数字电路与时序设计.md",
 "title": "面试题 · 数字电路与时序设计",
 "cat": "基础面试题目",
 "q": "异步 FIFO 怎么判断空和满？为什么用格雷码？",
 "a": "异步 FIFO 读写地址不同时钟域，不能直接比较，要先同步。空满判断：\n· 空：读写地址【完全相同】\n· 满：读写地址的【高 2 位不同、其余位均相同】\n（同步 FIFO 用二进制计数扩展一位：空=读写地址完全相同，满=最高位不同其余相同。）\n为什么用格雷码：格雷码【相邻只变 1 bit】，跨域同步时多位不会同时翻转，因此不会出现中间态，能避免亚稳态和采样错误。\n这是异步 FIFO 的核心设计点，也是面试高频追问。"
},
 {
 "id": "mstver-1",
 "note": "notes/基础面试题目/验证方法与流程.md",
 "title": "面试题 · 验证方法与流程",
 "cat": "基础面试题目",
 "q": "测试点分解要满足哪几条原则？一个测试点和一个测试用例是什么关系？",
 "a": "四条原则：\n· 完备性：不能遗漏任何功能点，特别是【异常处理、边界处理、容错处理】—— 这些最容易被忽视\n· 低耦合：不同测试点相关性甚低最好，直接决定分解粒度，影响 testcase 开发难度\n· 无歧义：描述直接明确，不同测试点之间不存在矛盾\n· 扩展性：包含异常和边界特性\n关系：\n· 一个测试用例【可以】覆盖多个测试点（考虑复杂度和时间的前提下尽量多覆盖）\n· 单个测试点在一个用例中【必须被覆盖】。若需要多个用例都通过后某个点才被覆盖，必定是【测试点分解太粗】，要重新细化\n总结：一个用例可含多个点；一个点不能被拆到多个用例（但一个点可以在多个用例中被包含）。"
},
 {
 "id": "mstver-2",
 "note": "notes/基础面试题目/验证方法与流程.md",
 "title": "面试题 · 验证方法与流程",
 "cat": "基础面试题目",
 "q": "覆盖率没到 100% 怎么收敛？如果代码 95% 功能 80% 但 pass 100% 呢？",
 "a": "通用方法三条：① 新增约束；② 添加测试用例；③ 用【不同的种子】跑现有用例。\n给定\"代码 95%、功能 80%、pass 100%\"，针对性做法：针对【RTL 代码没运行的部分】和【功能覆盖率没采样到的部分】写新用例，可以新增约束或用定向测试。\n条件覆盖率没到 100% 的定位法：先【查看覆盖率报告】定位到 RTL 代码中具体位置，看清条件表达式，再新增约束或定向测试让每个子表达式都能取到 true 和 false。—— 这个方法同样适用于\"怎么提高代码覆盖率\"：看到什么就覆盖什么。\n★ 关键是先看报告定位到行号，不要盲写用例。"
},
 {
 "id": "mstver-3",
 "note": "notes/基础面试题目/验证方法与流程.md",
 "title": "面试题 · 验证方法与流程",
 "cat": "基础面试题目",
 "q": "验证不能检查出 DUT 的哪些问题？前仿能检查亚稳态吗？",
 "a": "验证【检查不出】的：\n· 数据处理效率问题：例如 DUT 里可以插多个 FIFO 提高效率 —— 一个 buffer 处理完一个才能接下一个，两个 buffer 时第二个可以先存着，第一个处理完立刻切换。这种【性能差异在 RTL 功能仿真里看不出来】。\n· 建立保持时间、亚稳态、竞争冒险——都检查不到。\n前仿【不能】检查亚稳态。因为前仿是 RTL 级仿真，没有时序延时信息，而亚稳态本质是时序问题（违反建立/保持时间）。要看这类问题只能靠 STA（静态时序分析）或后仿（门级仿真，产生 SDF 文件）。"
},
 {
 "id": "mstver-4",
 "note": "notes/基础面试题目/验证方法与流程.md",
 "title": "面试题 · 验证方法与流程",
 "cat": "基础面试题目",
 "q": "拿到一个项目后，验证活动的标准六步是什么？",
 "a": "① 看 DUT 设计文档，弄清功能与接口时序，【提取功能点】\n② 画验证框图，展开底层组件\n③ 根据细化的功能点写测试用例：先写【一个】testcase 和一些基础 sequence，确保环境能跑通，再写其他\n④ 大规模随机测试，收集代码和功能覆盖率\n⑤ 查看覆盖率报告，分析未覆盖的部分，写【定向测试】+ 换种子继续跑\n⑥ 【回归测试】把所有用例再同时跑一遍，在极端情况下找出设计或验证环境的 bug\n⑦ 撰写验证报告，开会讨论、review\n★ 回答时必须结合自己项目：具体功能点有哪些、覆盖率各到多少、收集覆盖率的语句写在 testbench 的哪些组件中。"
},
 {
 "id": "mstbus-1",
 "note": "notes/基础面试题目/总线协议AHB_APB_AXI.md",
 "title": "面试题 · 总线协议 AHB APB AXI",
 "cat": "基础面试题目",
 "q": "AXI 有哪五个通道？为什么没有独立的读响应通道？",
 "a": "五个通道：\n· 读/写地址通道（ARADDR/AWADDR）：传输一次数据所需的地址和控制信息\n· 读数据通道（RDATA）：从机向主机返回读数据和读响应信息\n· 写数据通道（WDATA）：主机向从机传输写数据\n· 写响应通道（BRESP）：从机返回写响应信息\n（读地址+写地址算两个，写响应独立 ⇒ 共 5 个。）\n没有独立读响应通道的原因：读响应信息【RRESP 可以作为读数据通道的一部分传递】。\n★ 记忆：AXI 有独立的【写响应】通道，但【没有】独立的读响应通道。"
},
 {
 "id": "mstbus-2",
 "note": "notes/基础面试题目/总线协议AHB_APB_AXI.md",
 "title": "面试题 · 总线协议 AHB APB AXI",
 "cat": "基础面试题目",
 "q": "AXI 为什么不许跨 4KB 边界？AHB 为什么不许跨 1KB 边界？",
 "a": "AXI：slave 地址空间一般是 4KB 整数倍。AXI 在读/写地址通道的【开头】发出 addr/len/size，若一笔 burst 跨越 A 和 B 两个 slave，则【只有 A 收到】开头的 addr/len/size，B 收不到 → burst 无法完成。\nAHB：burst 不能跨 1KB 边界，slave 地址空间以 1KB 为单位，目的是让一个单独的 burst 不访问多个 slave。做法是在 1KB 边界处把 trans 改成【NON_SEQ】，重新发起一次 burst。\n★ 数字别记混：AXI 4K（低 12 bit 为 0），AHB 1K（低 10 bit 为 0）。"
},
 {
 "id": "mstbus-3",
 "note": "notes/基础面试题目/总线协议AHB_APB_AXI.md",
 "title": "面试题 · 总线协议 AHB APB AXI",
 "cat": "基础面试题目",
 "q": "outstanding 和 out-of-order / interleaving 有什么区别？",
 "a": "· outstanding：针对【地址】层面 —— 一次 burst 还没结束，就可以发送下一个 burst 的地址，大幅提高处理 transaction 的效率。主机在没收到 response 时能发起多笔 transaction 的能力。\n· out-of-order：针对【transaction】 —— 发送 transaction 和接收 cmd 之间的顺序无关。如先接 A 的 cmd 再接 B 的 cmd，可以先发 B 的 data 再发 A 的 data。\n· interleaving：也是 transaction 层面 —— A 和 B 的 data 可以交错：A1 B1 A2 B2 B3……但【同一个事务内部的各数据必须按顺序】，不能出现 A1 B2 A2 B1。\n规则：ID 相同的 transaction 必须顺序完成；ID 不同才可以乱序。"
},
 {
 "id": "mstbus-4",
 "note": "notes/基础面试题目/总线协议AHB_APB_AXI.md",
 "title": "面试题 · 总线协议 AHB APB AXI",
 "cat": "基础面试题目",
 "q": "AXI3 和 AXI4 的主要区别是什么？AXI4 为什么取消 WID？",
 "a": "主要区别：\n· burst length 最大值：AXI3 是【16】，AXI4 是【256】\n· WID：AXI3【有】，AXI4【取消】\n· 写通道：AXI3 支持 out-of-order 和 interleave；AXI4 所有写数据【全部有序】\n· AxQoS：AXI4 【新增】的用户服务质量信号\n取消 WID 的目的：避免乱序带来的【死锁问题】和【严重的 buffer 资源浪费】。\n本质上是 AXI4 用「牺牲乱序能力」换取「更简单、更省资源、可预测」的设计。"
},
 {
 "id": "mstproj-1",
 "note": "notes/基础面试题目/项目与综合面.md",
 "title": "面试题 · 项目与综合面",
 "cat": "基础面试题目",
 "q": "面试官问\"你的验证环境怎么搭的\"，他在确认哪四件事？",
 "a": "① 你懂不懂这个 IP 的功能（有没有真读过规格）\n② 功能点怎么变成测试点（有没有方法论）\n③ 遇到问题能不能 debug（有没有真干过）\n④ 结果如何（覆盖率、发现了什么 bug）\n只答第 4 层（\"我搭了个 UVM 环境跑通了\"）拿不到分。\n答题骨架：项目背景 → 读文档提取了哪些功能点 → 环境架构（几个 agent、scb 怎么比）→ 用了哪些 UVM 特性 → 遇到的问题和解决 → 最终覆盖率 % 和发现的 bug 数。\n★ 关键是必须带【具体数字】。"
},
 {
 "id": "mstproj-2",
 "note": "notes/基础面试题目/项目与综合面.md",
 "title": "面试题 · 项目与综合面",
 "cat": "基础面试题目",
 "q": "\"为什么选择验证岗位/为什么转行\"怎么答才稳？",
 "a": "四条按「行业→兴趣→性格→待遇」排：\n① 行业前景：芯片国产替代是大势所趋，IC 发展前景更广阔\n② 喜欢工作内容：验证要理解设计、提取功能点、搭环境、大规模随机测试、debug、回归迭代、收覆盖率，整个过程很有成就感，尤其环境跑通的时候\n③ 性格适合：不太喜欢社交，喜欢一门心思搞技术、喜欢钻研；验证工作量大繁琐，要求细心耐心、不急躁\n④ 待遇：IC 薪资高于行业平均\n★ 第 ④ 条【慎说或不说】—— 很多面试官会觉得\"你只是为钱\"。可改成\"希望在有技术含量的方向上长期深耕\"。\n★ 通用禁忌：别说\"验证轻松/不用写代码\"，这会直接暴露没干过。"
},
 {
 "id": "mstproj-3",
 "note": "notes/基础面试题目/项目与综合面.md",
 "title": "面试题 · 项目与综合面",
 "cat": "基础面试题目",
 "q": "介绍项目里的一个 DUT bug，怎么答才显得有分析能力？",
 "a": "框架：现象 → 定位过程 → 结论（谁的 bug）→ 怎么修。\n范例：UART —— 设计里没有给寄存器做复位操作。通过\"复位之后的读写测试\"发现：复位之后读出来的值不对，补不出 0。\n定位过程：前门写→前门读比对 → 发现读值是旧值 → 用【后门 peek】确认模型侧值正确 → 排除验证环境问题 → 交给设计。\n★ 要点：① 必须说清【怎么定位到 RTL 而不是环境】；② 能举出\"用后门排除验证环境\"这类手段最好；③ 教训要带一句——\"先写再读这种测试发现不了地址映射错误，必须前门+后门结合\"。"
},
 {
 "id": "mstproj-4",
 "note": "notes/基础面试题目/项目与综合面.md",
 "title": "面试题 · 项目与综合面",
 "cat": "基础面试题目",
 "q": "scoreboard 到底怎么写的？怎么比较数据的？",
 "a": "四步：\n① 数据从哪来：monitor → analysis_port → scb 的 analysis_imp；reference model 自己产生期望值\n② 比什么：逐字段比（address/data/len），或用 field_automation 的 compare\n③ 怎么处理顺序：队列/fifo 按【时间戳】对齐，或用 uvm_event/mailbox 同步\n④ 不一致时：$error 打印不一致字段 + transaction 快照，然后从波形定位到对应时间段\n加分点：说明为什么要加时间戳字段 —— 因为 driver 发出和 monitor 采回之间有延迟，没有时间戳就没法严格配对。\n★ 只说\"用队列比一下\"是不够的，要说清【期望值从哪来、怎么配对、失败怎么定位】。"
}
,
 {
  "id": "veng-kuj-1",
  "note": "notes/验证工程/骨架速记.md",
  "title": "验证工程 · 骨架速记",
  "cat": "验证工程",
  "q": "不看笔记，把一个 UVM 环境的八股结构默画出来（一共几层、每层有哪些文件、哪个文件占工作量最大）",
  "a": "八股：\n① tb_top：时钟 + 例化 DUT + 塞 vif + run_test()\n② interface：信号 + clocking + 协议 task ← 30% 工作量\n③ agent（一个接口一个）：seq_item / sequencer / driver / monitor / agent_config / agent / coverage_collector\n④ seq_item：一个 item = 一次完整事务\n⑤ driver（最简单）+ monitor（最难）\n⑥ env：env_config / scoreboard（20% 工作量）/ env\n⑦ sequence_lib：base_seq + 5~15 个场景\n⑧ test_lib：base_test + 各 test\n★★ 工作量：interface 30%、monitor 25%、scoreboard 20%、覆盖率 10%、sequence 10%、其他 5%。\n★ 三个口诀：一个接口=一个 agent；一个 item=一次完整事务；一个 test=一个场景+一组配置。"
 },
 {
  "id": "veng-kuj-2",
  "note": "notes/验证工程/骨架速记.md",
  "title": "验证工程 · 骨架速记",
  "cat": "验证工程",
  "q": "为什么 base_test 的 super.build_phase() 必须放最后？放前面会怎样？",
  "a": "因为 env 的 build_phase 由 UVM 在 test 的 build_phase【返回之后】才执行。\n放开头 → 等于让子组件先 build → 而此时 config_db 里还没有 AGENT_CFG → agent 拿不到配置就 fatal（报 [AGT_CFG] Cannot get ...）。\n正确顺序：配置先行 → 全部 set 完 → 最后一行 super.build_phase()。\n★★ 对比记忆：super.build_phase() 要放【最后】，super.run_phase() 【根本不要写】（run_phase 是阻塞 task，自己调 = 自己死等自己）。这两个是不同的坑。"
 },
 {
  "id": "veng-kuj-3",
  "note": "notes/验证工程/骨架速记.md",
  "title": "验证工程 · 骨架速记",
  "cat": "验证工程",
  "q": "拿到一个 RTL 之后，搭 UVM 环境的 7 步顺序是什么？其中第 2.5 步是什么、为什么不能跳？",
  "a": "1 defines 列 parameter 宏\n2 global_pkg + interface + tb_top 例化 DUT\n2.5 ★★ 写纯 SV 冒烟测试（20 行，不含 UVM）\n3 seq_item + agent_config + sequencer + monitor（monitor 先跑通）\n4 driver\n5 scoreboard 参考模型\n6 base_test + 各 seq + 各 test\n7 covergroup bins\n★★ 第 2.5 步的价值只有一个：【分清\"RTL 错了\"还是\"VIP 错了\"】。\n实测回报：3 个 RTL bug（FIFO 指针宽度、READY 依赖组合逻辑、标志清零不同拍）全部靠冒烟测试 10 分钟内定位；直接上 UVM 会误判成\"VIP 写错\"，绕几小时。\n★ 为什么 monitor 先于 driver：monitor 只观察，跑通它说明 interface 和采样没问题；先写 driver 的话采样和时序两个问题缠在一起，定位成本翻倍。"
 },
 {
  "id": "veng-kuj-4",
  "note": "notes/验证工程/骨架速记.md",
  "title": "验证工程 · 骨架速记",
  "cat": "验证工程",
  "q": "列出你知道的\"不报错但结果是错的\"的静默失败例子（工程层面）",
  "a": "7 个（都是仿真跑完了、不报 fatal、不中断）：\n① ★★★ sequence 直接调 intf.axi_write() → driven: 0 wr / 0 rd，验证完全空跑\n② ★★★ recv_b 只等 bvalid 不等 bready → 单场景全绿，regress 死锁到看门狗\n③ ★★★ monitor 复位期就采集 → 报激励里根本没发生的读（DUT 输出是 X）\n④ ★★★ monitor 采样 TB 驱动侧信号走了 clocking → 12 条 vsim-8441 + 静默采不到值\n⑤ ★★★ monitor 用 fork...join 汇合多个 forever → 统计全 0\n⑥ ★★ 约束漏 local:: → 恒真约束，写读地址对不上，像 scoreboard 的错\n⑦ ★★ 影子模型场景间没重置 → 假 mismatch，像 RTL bug\n★ 共同点：只能靠看 SB_SUMMARY 的 driven / compared 数字对不对才能发现。养成习惯：看到 0 mismatches 先确认 driven 和 compared 不是 0。"
 },
 {
  "id": "veng-if-1",
  "note": "notes/验证工程/interface与协议封装.md",
  "title": "验证工程 · interface与协议封装",
  "cat": "验证工程",
  "q": "interface 里信号的方向怎么定？为什么不能照抄 RTL 的端口方向？",
  "a": "判据是【谁驱动】，不是照抄 RTL 端口。\n· TB 驱动（我要送出去的）→ logic\n· DUT 驱动（我要收回来的）→ wire\n为什么不能照抄：AXI4-Lite 从设备的 rd_en 在 RTL 里是【输入】（从设备要读数据），但对 TB 来说它是【stimulus】（我要发起一次读）→ 必须写 logic。\n★ 实测踩过：照抄写成 wire，reset_if() 里给它赋值 → vlog-2110 Illegal reference to net，而报错在 interface 里，第一反应会以为是 clocking 写错。\n★ 还要注意：clocking 块里的方向必须与顶层声明一致，否则 vlog-2224。"
 },
 {
  "id": "veng-if-2",
  "note": "notes/验证工程/interface与协议封装.md",
  "title": "验证工程 · interface与协议封装",
  "cat": "验证工程",
  "q": "monitor 采样时，哪些信号可以直接读接口、哪些必须走 clocking？写错了会怎样？",
  "a": "按方向分：\n· TB 驱动侧（VALID / ADDR / DATA / STRB / READY 由 TB 发）→ 直接读 intf.xxx\n· DUT 驱动侧（READY / VALID / DATA / RESP 由 DUT 发）→ 走 intf.cb.xxx\n写错的后果是【静默失效】：写 intf.cb.awvalid（output 方向）→ 报 12 条 vsim-8441 Clocking block output not legal in this context，但【不中断仿真，只是采不到值】→ monitor 一个 item 都不发 → scoreboard 统计全 0。\n★ 这是最危险的一类错误：不报 fatal，看起来\"跑完了\"，实际什么都没验。"
 },
 {
  "id": "veng-if-3",
  "note": "notes/验证工程/interface与协议封装.md",
  "title": "验证工程 · interface与协议封装",
  "cat": "验证工程",
  "q": "为什么协议握手必须封成 interface 里的 task，而不是写在 driver 里？封装到什么程度算够？",
  "a": "因为 driver 里出现 @(cb) 和 if 就说明封装失败了。\n自检方法：把 driver 的 drive_item 读完，如果里面还有时钟沿控制或握手判断，说明波形逻辑没封干净。\n封好的样子：drive_item 里只剩 case 分支调 intf.axi_write(addr, data, strb, resp)。\n★ 收益不只是代码短：① 改协议时序只改 interface 一处 ② driver 只关心\"发什么激励\"不关心\"怎么打时序\" ③ 波形一眼看懂，方便 debug。\n★ 组合事务内部要【顺序发】不要 fork...join：实测两个进程同时操作同一 clocking block 会让 output skew 语义打架 → recv_b 永久阻塞 → 死锁到看门狗。"
 },
 {
  "id": "veng-if-4",
  "note": "notes/验证工程/interface与协议封装.md",
  "title": "验证工程 · interface与协议封装",
  "cat": "验证工程",
  "q": "recv_b 这类等待响应的 task，握手条件和超时保护要怎么写？为什么？",
  "a": "两个要点：\n① 握手条件要等 【valid && ready】两个，不能只等 valid\n   ❌ do @(cb); while (!cb.bvalid);\n   ✅ do @(cb); while (!(cb.bvalid && bready) && (guard++ < 1000));\n② 必须加超时保护，guard 到上限就打印现场（bvalid/awready 等）\n★ 只等 valid 的症状：单场景全绿，串进 regress 后死等 bvalid 到看门狗（因为 bready 拉高前 bvalid 可能已置位一拍，会在错误的拍退出）。\n★ 超时的价值：死等时只有全局看门狗（2ms）兜底，丢掉全部现场；加了超时才能看到\"bvalid=0 awready=1\"这种有用信息。\n★ 注意：interface 内部引用信号直接写名字，不能写 intf.xxx（intf 在 interface 内不存在 → vopt-7063）；超时打印用纯 ASCII，中文会乱码。"
 },
 {
  "id": "veng-dm-1",
  "note": "notes/验证工程/driver与monitor的实现要点.md",
  "title": "验证工程 · driver与monitor的实现要点",
  "cat": "验证工程",
  "q": "monitor 为什么必须写成\"4 个采集进程 + 1 个派发进程\"？用 fork...join 汇合会怎样？",
  "a": "因为 AXI 有 5 个独立握手的通道，不存在统一的\"事务边界\"可以一把抓。\n❌ 写成 fork...join 汇合 4 个 forever 进程 → 编译能过、仿真不报错、monitor 一个 item 都不发 → SB_SUMMARY 统计全是 0。最难查的一类\"假通过\"。\n✓ 正确结构：\n  fork\n    record_aw(); record_ar();        // 握手 → 缓存\n    collect_write(); collect_read();  // 完整事务 → 入队\n    dispatch();                       // ★ 唯一调用 ap.write 的地方\n  join\n★ 为什么 dispatch 要单独一个：保证所有 item 走同一条出口，tr_id 不会乱；tr_id 在 dispatch 里统一分配，monitor 和 driver 各自计数会对不上。"
 },
 {
  "id": "veng-dm-2",
  "note": "notes/验证工程/driver与monitor的实现要点.md",
  "title": "验证工程 · driver与monitor的实现要点",
  "cat": "验证工程",
  "q": "monitor 采集写事务时，为什么必须等 B 响应才能把 item 发出去？AW/W 的顺序问题怎么处理？",
  "a": "① 必须等 B：AXI 的 BRESP 才是\"这次写成功没有\"的唯一信息。不等 B → 拿不到 SLVERR/DECERR → scoreboard 误判这次写的响应。\n   写法：wait (m_aw_seen && m_w_seen); 然后 do @(posedge intf.cb); while (!(intf.cb.bvalid && bready));\n② AW/W 顺序：AXI4-Lite 允许任意顺序甚至同时，所以必须各用独立标志缓存（m_aw_seen / m_w_seen），在 record_aw() 里分别判断两个握手，收齐后再清标志。\n★ 采样时按方向分：TB 驱动的 awvalid/awaddr 直接读 intf，DUT 驱动的 awready 走 cb。"
 },
 {
  "id": "veng-dm-3",
  "note": "notes/验证工程/driver与monitor的实现要点.md",
  "title": "验证工程 · driver与monitor的实现要点",
  "cat": "验证工程",
  "q": "为什么控制命令（比如场景间复位）必须挂在 seq_item 上，不能走 interface 信号或 driver 成员变量？",
  "a": "因为 driver 只在 get_next_item() 返回后才会被唤醒去处理控制请求。任何\"旁路\"机制都会缺了\"唤醒\"或\"看见命令\"其中一半。\n实测三种旁路都失败：\n① interface 里加 bit rst_req → virtual interface 访问非 clocking 成员行为不可靠，driver 读不到\n② driver 加成员变量 rst_req → test 置了，但 driver 阻塞在 get_next_item()，没人唤醒它 → 死锁\n③ 裸调 sequencer.start_item() → 需要 sequence 上下文（grant 机制），报 HDL call sequence 错误\n★ item 是唯一解：get_next_item() 返回 = driver 被唤醒，命令和唤醒用同一个动作完成。"
 },
 {
  "id": "veng-sb-1",
  "note": "notes/验证工程/scoreboard参考模型.md",
  "title": "验证工程 · scoreboard参考模型",
  "cat": "验证工程",
  "q": "影子模型为什么必须在 new() 里预置复位态寄存器？场景之间为什么要 reset_model()？",
  "a": "① new() 里预置：影子模型要镜像 DUT 的【复位态】，而不只是运行到的那部分。否则\"复位后直接读\"会全部报 read without prior write，而这恰恰是最常见的第一个用例。常见误区是只把\"写过\"的寄存器放进去。\n② 场景间重置：不同场景对初值的假设不同（WSTRB 场景假设寄存器是 0，错误场景假设 FIFO 是空的）。不重置就互相污染。\n★★ 实测踩过：regress 报 16 个 mismatch，如 read addr=0x10 exp=0xffffffff got=0x12345678。第一反应是\"DUT 有 bug\"，实际是模型脏了。\n★ 判据：模型和 DUT 对不上时，先确认【两者都复位了】，再怀疑 RTL。顺序反了会白查几小时。"
 },
 {
  "id": "veng-sb-2",
  "note": "notes/验证工程/scoreboard参考模型.md",
  "title": "验证工程 · scoreboard参考模型",
  "cat": "验证工程",
  "q": "AXI4-Lite 的 WSTRB 字节掩码在参考模型里怎么处理？漏了会是什么症状？",
  "a": "写入的新值不是直接等于 wdata，而是按字节合并：new[i] = wstrb[i] ? wdata[i] : old[i]。\nfunction apply_strb(old_val, new_val, strb);\n  res = old_val;                      // ★ 先取旧值\n  for (int i = 0; i < STRB_W; i++)\n    if (strb[i]) res[i*8 +: 8] = new_val[i*8 +: 8];\n  return res;\nendfunction\n★ 漏了 WSTRB → 模型算错、DUT 是对的 → 表现为【随机地】报 mismatch（取决于写入数据和掩码的组合），极难定位。\n★ 放这函数在 global_pkg 里，AXI 家族都能直接抄。"
 },
 {
  "id": "veng-sb-3",
  "note": "notes/验证工程/scoreboard参考模型.md",
  "title": "验证工程 · scoreboard参考模型",
  "cat": "验证工程",
  "q": "为什么读一个从未写过的寄存器只能报 warning 不能报 error？env_config 里嵌套 config 的那行 new() 为什么不能少？",
  "a": "① 读未初始化寄存器：DUT 返回复位值 0 是【合法行为】。报 error 会让随机激励满屏假警报，反而掩盖真问题。正确做法：warning 提示 + 只在\"不是复位值 0\"时才报 error。判据是【模型只对它能确定的下断言】。\n② 嵌套 config 的 new()：只声明不 new 的话它保持 null；test 里写 env_cfg.agnt_cfg.is_active = ... 就是在解引用空句柄 → SIGSEGV，而栈顶显示在 uvm_config_db::get 里，完全指不到真正原因。\n★★ 用 new() 不用 type_id::create —— uvm_object 不走工厂。\n★ 这是全模板最容易漏的一行。"
 },
 {
  "id": "veng-test-1",
  "note": "notes/验证工程/test与场景编排.md",
  "title": "验证工程 · test与场景编排",
  "cat": "验证工程",
  "q": "为什么 test 的 run_phase 里不能调 super.run_phase()？症状是什么？",
  "a": "run_phase 是阻塞 task，它内部要等所有子进程跑完才返回。test 自己就是 run_phase 的执行者之一，在开头调 super.run_phase(phase) = 自己死等自己。\n症状：仿真在 Time: 0 就 $finish，一条 [SEQ] 日志都没有，driver 报 \"0 items driven\" —— 看起来像\"激励没跑起来\"。\n正确做法：一般直接不写（uvm_test 的默认实现是空的），建议显式 raise_objection / drop_objection。\n★★ 对比记忆：super.build_phase() 放【最后】，super.run_phase() 【根本不要写】。两个不同的坑。"
 },
 {
  "id": "veng-test-2",
  "note": "notes/验证工程/test与场景编排.md",
  "title": "验证工程 · test与场景编排",
  "cat": "验证工程",
  "q": "场景之间为什么不能只靠 #delay 串联？正确的做法是什么？",
  "a": "#(delay) 只保证\"过了一段时间\"，不保证 driver 已经 item_done()。\n实测症状：5 个场景【单跑全绿】，串进 regress 立刻死锁，拓扑里 num_last_reqs=1（driver 拿了 item 不归还）。\n正确做法用 run_seq_chain，四件事缺一不可：\n① reset_dut() 让 DUT 复位\n② env_i.scb.reset_model() 影子模型也要复位 ★\n③ start_seq(seq)\n④ #(500ns) 等 DUT 把所有响应收完（AXI 单笔最长 ~6 拍 = 60ns，给 10 倍余量）\n★ 注意不能裸调 sequencer.start_item() 来\"唤醒\"driver —— 需要 sequence 上下文（grant 机制），裸调报 HDL call sequence 错误。"
 },
 {
  "id": "veng-test-3",
  "note": "notes/验证工程/test与场景编排.md",
  "title": "验证工程 · test与场景编排",
  "cat": "验证工程",
  "q": "一个合格的功能验证环境，激励场景应该分哪几类？为什么\"错误场景\"和\"字节掩码\"特别容易漏？",
  "a": "五类：① 基本读写（每个可读写寄存器能写能读回）② 边界与错误（写只读/越界/空 FIFO）③ 字节掩码（部分字节写）④ 连续流（深度、状态位、顺序）⑤ 随机压测（corner case）。数量按\"RTL 有几个需单独验的功能点\"定，通常 5~15 个。\n★ 为什么②③容易漏：不专门构造就悄悄漏掉，而它们恰好是 bug 高发区。\n★ 实用判据：RTL 里凡是 if(err) / if(illegal) 的分支，都必须有对应激励打到它。可以用覆盖率 ignore_bins 检查有没有漏。\n★ 公共动作（do_write/do_read）上提到 base_seq，派生 seq 只写\"要验什么\"不碰协议细节。\n★★ 约束引用外层变量必须加 local:: 前缀，否则是恒真约束。"
 },
 {
  "id": "veng-axi-1",
  "note": "notes/验证工程/AXI4Lite实战复盘.md",
  "title": "验证工程 · AXI4Lite实战复盘",
  "cat": "验证工程",
  "q": "这次 AXI4-Lite VIP 实战，RTL 侧抓到哪几个 bug？为什么它们\"读就近几行看不出来\"？",
  "a": "三个，全部靠冒烟测试 10 分钟内定位：\n① FIFO 指针宽度写成 $clog2(FIFO_D) 而非 $clog2(FIFO_D):0 → 深度是 2 的幂时存不下 8，full 永不置位。【隐蔽在哪：深度 5 或 7 时一切正常，只有 2 的幂才暴露】\n② awready = ~do_write，而 do_write 是组合逻辑 → 沿上毛刺，TB 错过握手。改成显式状态机 WR_RECV/WR_EXEC/WR_WAITB。\n③ 标志清零放在各通道 else 分支 → do_write 组合出的 1 落在同一拍但赋给 aw_hs 的是下一拍的值，状态脱节。必须\"清标志+执行写+置bvalid\"在同一拍。\n★★ 教训：这些 bug 在 UVM 里会表现成\"VIP 写错了\"，白查几小时。先写冒烟测试的价值就在这。"
 },
 {
  "id": "veng-axi-2",
  "note": "notes/验证工程/AXI4Lite实战复盘.md",
  "title": "验证工程 · AXI4Lite实战复盘",
  "cat": "验证工程",
  "q": "这次 AXI4-Lite VIP 的覆盖率建模里，哪两个 coverpoint 是核心？为什么？",
  "a": "cp_err（错误场景）和 cp_strb（字节掩码）。\n★ cp_err 覆盖三类错误：写只读 → SLVERR、越界 → DECERR、空 FIFO 读 → SLVERR。它们在激励里不专门构造就会【悄悄漏掉】，而这些恰好是 RTL bug 高发区。\n★ cp_strb 覆盖四种掩码：全字节/低字节/高字节/中间两字节。AXI4-Lite 的部分字节写是最典型的 bug 源。\n其他 coverpoint（cp_op/cp_bresp/cp_rresp）比较常规。\n★ 最终 88.83%：未覆盖的 11% 主要是正常地址段和部分 cross 组合没专门激励。我选择如实留着而不是删 bin 凑好看—— 它是\"还有激励没写\"的诚实记录。\n★ 建模的对象是【验证点】，不是\"信号翻转了多少次\"。"
 }
,
 {
  "id": "veng-idx-1",
  "note": "notes/验证工程/索引.md",
  "title": "验证工程 · 索引",
  "cat": "验证工程",
  "q": "这套验证工程材料一共几篇？每天复习应该看哪一篇、为什么？",
  "a": "共6 篇（索引 + 5 篇正文）。\n★ 每天只需要看一篇：【验证工程 · 骨架速记】。\n理由：那一页已经把【八股结构图 + 三级配置链 + 7 步搭建顺序 + 工作量分布 + 7 个静默失败】全压缩进去了，默念一遍就够在写验证时立刻架构出初始版本。\n其余五篇是它的展开，只在\"某一块忘了\"时才翻：\n· interface与协议封装 → 方向判定 / clocking 硬规矩 / 协议 task 骨架\n· driver与monitor的实现要点 → 4 行骨架 / 采集-派发分离 / 三个必错点\n· scoreboard参考模型 → 双口 imp_decl / 复位态预置 / WSTRB 合并\n· test与场景编排 → 相位死锁 / 5 类场景 / 复位握手\n· AXI4Lite实战复盘 → 一份真实 VIP 的完整过程 + 11 个实测坑\n★ 建议配合自测页的\"今日复习\"一起用。"
 }
];
