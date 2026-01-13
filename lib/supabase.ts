import { createBrowserClient } from '@supabase/ssr'

// 创建一个能自动处理浏览器 Cookie 的 Supabase 客户端
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)