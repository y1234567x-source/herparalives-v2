# 意见反馈、故事评价和分享

## 配置与迁移

在目标 Supabase 项目应用 `supabase/migrations/20261128071152_feedback_and_sharing.sql`。现有项目自带 `auth.users`，本迁移不依赖云存档表。已有迁移历史的项目应通过其正常发布流程应用这份迁移。

| 变量 | 用途 |
| --- | --- |
| `SUPABASE_URL` | Supabase 项目的 API 地址 |
| `SUPABASE_FEEDBACK_SECRET_KEY` | 仅部署在服务端的 Supabase secret key（`sb_secret_…`）。也兼容 `SUPABASE_SERVICE_ROLE_KEY` 中的旧版服务端密钥 |
| `SUPABASE_PUBLISHABLE_KEY` 或 `SUPABASE_ANON_KEY` | 复用现有登录配置，用于核验当前会话和关联账号 |
| `SITE_URL` | 分享和社交预览使用的网站根地址。Vercel 未设置该项时使用当前部署 URL。正式部署应设为正式站根地址 |

服务端密钥不可使用 `NEXT_PUBLIC_` 前缀。缺少反馈配置、迁移或数据库连接时，提交会明确显示暂不可用。保持预览与正式环境的凭据独立管理。

## 查看数据

团队可在 Supabase Table Editor 读取 `user_feedback` 和 `story_feedback`。登录用户的 ID 来自服务端校验后的 Supabase 会话，游客的 `user_id` 为空。联系方式选填。删除账号后，关联 ID 置空。

普通访问角色没有表权限或提交 RPC 权限。网站通过同源服务端接口校验请求，再调用只授予服务端角色的 RPC。每个来源合计最多 8 条有效提交 / 10 分钟，数据库以事务锁保证并发限额。仅信任 Vercel 提供的来源地址，数据库保留 HMAC 摘要。缺少可信地址时共享保守配额。反馈重试通过请求 ID 去重，故事评价通过故事及体验标识去重，已保存结果不会被重复提交覆盖。旧版本的 `legacy-record` 共用占位 ID，由浏览器附加标识区分。

## 协作

本分支以当前 `main` 为基线，可独立接入反馈。PR #3 和 #4 都涉及 `app/experience.tsx`、`app/my-space.tsx`，合并时保留各自的体验与存档逻辑及本分支新增挂载点。合并演练显示，PR #3 与 `app/layout.tsx` 存在冲突，需同时保留当前浅紫主题、移动端配置与分享元数据。PR #4 与 `server/auth.ts` 存在冲突，可采用 #4 的会话实现，其 `currentUser().userId` 和环境变量兼容性满足本分支的反馈接口。故事评价通过现有体验 ID 关联，后续可用于云存档和用户分组分析。

故事馆目前没有故事独立访问路由，因此三个分享入口均使用网站首页。社交封面沿用现有首页插画。关于页的联系方式和隐私政策在内容确认前显示待公布提示。
