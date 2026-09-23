#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 workbench-data.json（飞书多维表格 Base 快照）生成 marketplace.html 可直接加载的
workbench-data.js 数据文件。

用法：
  1) 更新数据：python3 scripts/pull_base.py         # 拉取 Base 全量 → docs/workbench-data.json
  2) 生成数据：python3 scripts/build_workbench_data.py  # JSON → docs/workbench-data.js
  3) 刷新浏览器即可看到 Base 最新数据（无需改 HTML）

映射关系（Base 表 → 页面结构）：
  入职任务        → SEED_TASKS（78 条，状态映射：进行中→today / 未开始→todo / 已完成→done:true，已锁定跳过）
  入职任务.任务分类 → TRACKS（四条成长线 done/total 实时统计）
  入职任务.阶段    → PHASES（五站旅程进度）
  工具教程        → GUIDES（按所属工具分组）
  知识测验        → QUIZ（正确答案+错误选项 → 二选一）
  工作工具        → LINKS（工具卡片：分类/必修/掌握程度）
  团队成员        → ROLES（身份切换）
"""
import json
from collections import Counter, OrderedDict

DOCS = "/Users/tqqq/Documents/git/dw/multibillion/feishu-ai/doubao-work/docs"

def load():
    with open(f"{DOCS}/workbench-data.json", encoding="utf-8") as f:
        return json.load(f)

def phase_short(p):
    return {
        "Week 1 入职适应": "Week 1", "Week 2 环境搭建": "Week 2",
        "Week 3-4 入门实践": "Week 3-4", "Week 5-8 独立贡献": "Week 5-8",
        "Week 9-12 深度融入": "Week 9-12",
    }.get(p, p)

def build(d):
    tasks, tutorials, quiz, members, tools = d["tasks"], d["tutorials"], d["quiz"], d["members"], d["tools"]
    CAT2TR = {"熟悉工友": "t1", "熟悉工具": "t2", "熟悉业务": "t3", "熟悉项目": "t4"}
    TR_INFO = {"t1": ("熟悉工友", "groups"), "t2": ("熟悉工具", "widgets"),
               "t3": ("熟悉业务", "trending"), "t4": ("熟悉项目", "folder")}
    TR_DS = {"熟悉工友": "认识导师、Leader、协作方，约 1 对 1 破冰。",
             "熟悉工具": "装好 P0/P1 软件，跑通构建与提交流程。",
             "熟悉业务": "读懂团队目标、指标口径与产品脉络。",
             "熟悉项目": "跑通需求到上线的完整链路。"}
    DOPC = ["green", "blue", "orange", "pink", "red", "teal", "amber", "lime", "cyan"]
    ICONS = ["chat", "code", "brush", "barchart"]

    # ---- SEED_TASKS ----
    seed = []
    for i, t in enumerate(tasks):
        if t.get("任务状态") and t["任务状态"][0] == "已锁定":
            continue
        cat = t.get("任务分类")[0] if t.get("任务分类") else "熟悉工具"
        st = t.get("任务状态")[0] if t.get("任务状态") else "未开始"
        w, done0 = ("today", False) if st == "进行中" else (("todo", True) if st == "已完成" else ("todo", False))
        phase = t.get("阶段")[0] if t.get("阶段") else ""
        craft = t.get("所属工种")[0] if t.get("所属工种") else ""
        by = "成长系统 Base · " + (phase + " · " + craft if craft else phase)
        seed.append({"id": "b" + str(i + 1), "t": t["任务名称"], "tr": CAT2TR.get(cat, "t2"),
                     "w": w, "d": t.get("任务描述") or "", "by": by, "done": done0})

    # ---- TRACKS ----
    cat_total, cat_done = Counter(), Counter()
    for t in tasks:
        cat = t.get("任务分类")[0] if t.get("任务分类") else None
        if not cat:
            continue
        cat_total[cat] += 1
        if t.get("任务状态") and t["任务状态"][0] == "已完成":
            cat_done[cat] += 1
    for t in tasks:  # 已锁定不计入展示
        if t.get("任务状态") and t["任务状态"][0] == "已锁定":
            cat = t.get("任务分类")[0] if t.get("任务分类") else None
            if cat:
                cat_total[cat] -= 1
    tracks = []
    for tid, (name, icon) in TR_INFO.items():
        total, done = cat_total.get(name, 0), cat_done.get(name, 0)
        tracks.append({"id": tid, "name": name, "icon": icon, "c": None,
                       "ds": TR_DS.get(name, ""), "t": f"{total} 项 · 已做 {done}",
                       "done": done, "total": total})

    # ---- PHASES ----
    order = ["Week 1 入职适应", "Week 2 环境搭建", "Week 3-4 入门实践", "Week 5-8 独立贡献", "Week 9-12 深度融入"]
    ph_total, ph_done = Counter(), Counter()
    for t in tasks:
        p = t.get("阶段")[0] if t.get("阶段") else None
        if not p:
            continue
        ph_total[p] += 1
        if t.get("任务状态") and t["任务状态"][0] == "已完成":
            ph_done[p] += 1
    phases = []
    for p in order:
        tot, dn = ph_total.get(p, 0), ph_done.get(p, 0)
        pct = round(dn / tot * 100) if tot else 0
        desc = p.split(" ", 1)[-1] if " " in p else p
        phases.append({"n": phase_short(p), "p": pct, "d": f"{desc} · {tot} 项"})

    # ---- GUIDES（教程按工具分组）----
    by_tool = OrderedDict()
    for t in tutorials:
        tool = t.get("所属工具")[0] if t.get("所属工具") else "其他"
        by_tool.setdefault(tool, []).append(t)
    guides = []
    for i, (tool, items) in enumerate(by_tool.items()):
        steps = []
        for it in items:
            mins = it.get("学习时长_分钟") or 0
            must = "必修" if it.get("是否必修") else "选修"
            steps.append(f"{it['教程标题']}（{must} · {mins} 分钟）")
        guides.append({"name": tool, "icon": ICONS[i % 4], "c": DOPC[i % 8], "steps": steps, "done": False})

    # ---- QUIZ ----
    quizzes = []
    for q in quiz:
        why = q.get("解析") or ""
        qtype = q.get("题目类型")[0] if q.get("题目类型") else "单选题"
        quizzes.append({"q": q["题目"], "opts": [q.get("正确答案") or "", q.get("错误选项") or ""],
                        "a": 0, "why": f"{why}（{qtype}）"})

    # ---- LINKS（工具卡片，无真实网址）----
    links = []
    for i, t in enumerate(tools):
        cat = t.get("工具分类")[0] if t.get("工具分类") else ""
        must = "必须掌握" if t.get("是否必须掌握") else "可选"
        level = round((t.get("掌握程度") or 0) * 100)
        links.append({"n": t["工具名称"], "u": "",
                      "d": f"{t.get('一句话说明') or ''} · {cat} · {must} · 掌握 {level}%",
                      "c": DOPC[i % 8]})

    # ---- ROLES（团队成员）----
    roles = []
    for m in members:
        name = m["姓名"]
        roles.append({"id": name, "name": name, "team": (m.get("团队") or [""])[0],
                      "role": m.get("职位") or "", "day": 3, "hi": "早上好，" + name,
                      "avatar": name[0], "intro": m.get("一句话介绍") or "",
                      "area": m.get("负责领域") or "", "tag": (m.get("角色标签") or [""])[0]})

    meta = {"source": "飞书多维表格 SzvXbwLAxaSPIMsQRO2chtsjnUb", "tasks": len(seed),
            "tutorials": len(tutorials), "quiz": len(quiz), "members": len(members), "tools": len(tools)}
    return {"PHASES": phases, "TRACKS": tracks, "SEED_TASKS": seed, "GUIDES": guides,
            "QUIZ": quizzes, "LINKS": links, "ROLES": roles, "META": meta}

def main():
    d = load()
    wb = build(d)
    js = "/* 由飞书多维表格 Base 数据自动生成 · 不要手改 · 重新生成见 scripts/build_workbench_data.py */\n"
    js += "window.WB = window.WB || {};\n"
    for k, v in wb.items():
        js += f"window.WB.{k} = " + json.dumps(v, ensure_ascii=False) + ";\n"
    with open(f"{DOCS}/workbench-data.js", "w", encoding="utf-8") as f:
        f.write(js)
    print("saved workbench-data.js", len(js), "bytes |",
          {k: (len(v) if isinstance(v, list) else v) for k, v in wb.items()})

if __name__ == "__main__":
    main()
