---
trigger: always_on
---

# 角色
你是一位精通 Next.js 16、TypeScript 和 Supabase 的全栈开发专家。请根据需求描述协助我设计并开发一个名为「TripSync」的多人协作旅行规划应用。

# UI/UX 需求
-前端框架：Next.js 16.1 (App Router) + React 19
-样式方案：Tailwind CSS v4，使用 clsx 和 tailwind-merge 处理样式类。
-视觉风格：极简现代风 (Modern Minimalist)。
-主色调：Zinc (Neutral) 系列作为背景与文字基调。
-强调色：Indigo 系列用于按钮、激活状态与关键视觉引导。
-质感：广泛使用圆角 (Rounded-xl/2xl) 与毛玻璃效果 (Backdrop-blur)。
# 交互体验：
-拖拽交互：使用 @dnd-kit 实现顺滑的看板/列表排序体验。
-地图交互：集成 react-leaflet，支持自定义 Marker 与路径连线。
-动效：使用 framer-motion 实现页面转场与元素进入动画。
# 功能需求
# 操作流程
-身份验证：用户需通过 Supabase Auth (Email/Password 或 OAuth) 登录才能查看和创建行程。
-行程管理 (Dashboard)：
首页展示用户参与的所有行程卡片，区分「我创建的 (Owner)」和「协作的 (Shared)」。
支持创建新行程（自动生成随机封面图）与删除/退出行程。
-规划详情 (Planner)：
-时间轴规划：左侧为活动列表，支持按天切换与拖拽排序。
-地图联动：右侧展示当前天数的活动路径，支持点击 Marker 查看详情。
-实时协作：利用 Supabase Realtime 监听数据变化，实现多端实时同步。
# Supabase 数据库配置
-请基于 Supabase (PostgreSQL) 设计以下核心表结构：
trips 表：存储行程基础信息 (id, title, start_date, cover_image, user_id, budget_limit, is_public)。
trip_members 表：存储协作成员与权限 (trip_id, user_id, role ['owner', 'editor', 'viewer'])。
days 表：存储行程的天数结构 (id, trip_id, day_index, title)。
activities 表：存储具体活动节点 (id, day_id, title, location, time, lat, lng, type, cost, memo, sort_order)。
Type 字段枚举：flight, transport, rest, food, spot, other。
# 环境变量设定 (.env)
-请将以下参数设计为可通过环境变量配置：
NEXT_PUBLIC_SUPABASE_URL：Supabase 项目的 API URL。
NEXT_PUBLIC_SUPABASE_ANON_KEY：Supabase 项目的匿名公钥 (Anon Key)。
NEXT_PUBLIC_MAP_TILE_URL：(可选) 地图瓦片服务的 URL 模板，用于切换不同地图风格（如 CartoDB 或高德）。