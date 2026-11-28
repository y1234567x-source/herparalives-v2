# 手机登录与云端存档

状态：已准备接入代码及数据库迁移；没有阿里云凭据、Supabase Auth Hook 配置与真实短信验收时，不能视为已开通手机登录。`SMS_LOGIN_ENABLED` 默认关闭。

## 账号与数据

- 账号身份与手机号由 Supabase Auth 管理，不再额外复制一份手机号表。
- `public.journey_records` 保存用户 ID、故事 ID、选择 ID 和服务器更新时间。碎片数根据故事记录计算；这不是付费权益账本。
- 表开启 RLS，游客不能访问，登录用户只能读写自己的记录。业务请求携带用户 access token，不使用 service-role key。
- 每个账号的本机缓存使用独立键；游客记录需要用户主动点击导入。登出后回到游客记录，不把账号记录写进游客缓存。
- 云端同步保留更长的进度；同一存档出现不同分支时另存一份。接口每次最多处理 100 条记录、每条 40 次选择。

## Supabase

1. 在专用项目中应用 `supabase/migrations` 中的迁移。
2. 在网站托管环境设置 `SUPABASE_URL` 和 `SUPABASE_PUBLISHABLE_KEY`（兼容旧 `SUPABASE_ANON_KEY`）。这些配置保留在服务端。
3. 开启 Phone 登录，将验证码长度设为 6 位、有效期设为 300 秒；与 `SMS_OTP_MINUTES=5` 保持一致。设置同一号码重发间隔至少 60 秒、项目短信发送总量上限及验证请求限额。公开推广前配置适当的验证码防刷保护，并确认前端已接入所选 CAPTCHA。
4. Auth Hooks 添加 Send SMS HTTP Hook，地址为网站的 `/api/auth/sms-hook`；把生成的签名密钥写入网站的 `SUPABASE_SMS_HOOK_SECRET`。不要将密钥写进仓库或聊天。
5. 新域名/受部署保护的预览地址需要确认 Supabase 能访问 Hook。Supabase 对 HTTP Hook 有较短超时；必须测试跨区域访问延迟。

## 阿里云个人开发者短信认证

1. 完成阿里云个人实名认证，在号码认证服务 PNVS 中开通「短信认证」。普通 SMS 产品的套餐不能抵扣 PNVS。
2. 使用已开通账号的赠送签名「恒创联众」和登录/注册模板 `100001`，分别填入 `ALIYUN_SMS_SIGN_NAME` 与 `ALIYUN_SMS_TEMPLATE_CODE`。模板变量为 `code` 和 `min`，发送请求使用阿里云默认方案。
3. 为专用 RAM 用户授予 `dypns:SendSmsVerifyCode`。由账号负责人生成 AccessKey，在网站托管环境设置 `ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`。
4. 本实现通过 Supabase Hook 传入 Supabase 生成的真实验证码，用 PNVS 的 `SendSmsVerifyCode` 下发。校验、失效和单次使用仍由 Supabase Auth 负责；不要把 PNVS 自行生成的验证码与 Supabase 验证混用。
5. 核实按量费用与发送上限，并使用负责人同意的测试号码完成真实收发测试，再设 `SMS_LOGIN_ENABLED=true`。

## 验收

`npm ci`、`npm run lint`、`npm test`、`npm run build`。数据库隔离与同步回归见 `supabase/tests/journey_sync.sql`，测试在事务中创建虚拟用户，最后回滚。

完成构建后运行 `npm run test:account`，会启动本地模拟 Supabase 与 Next 服务器，验证接口和会话；不会发送真实短信或连接生产数据库。

上线还须检查：错误/过期验证码、频繁重发、刷新及过期 token 续期、退出登录、A/B 账号隔离、游客记录主动导入、两设备续读、断网重连同步。真实短信未配置时只验证本地模拟链路，不把模拟结果称为真实短信验收。

参考：[Supabase SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook)、[阿里云个人开发者接入](https://help.aliyun.com/zh/pnvs/use-cases/sms-verify-for-individual-developers)、[SendSmsVerifyCode API](https://help.aliyun.com/en/pnvs/developer-reference/api-dypnsapi-2017-05-25-sendsmsverifycode)。
