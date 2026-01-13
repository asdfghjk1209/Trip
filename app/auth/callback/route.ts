import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 如果没有 next 参数，默认跳转到首页 /
  const next = searchParams.get('next') ?? '/'

  if (code) {
    // 1. 先创建一个响应对象 (准备跳转)
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // 读取 cookie：从请求中读
          get(name) {
            return request.cookies.get(name)?.value
          },
          // 写入 cookie：写到响应对象中
          set(name, value, options) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          // 删除 cookie：从响应对象中删除
          remove(name, options) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )
    
    // 2. 交换 Session (这一步会自动调用上面的 set 方法，把 cookie 写进 response)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 3. 返回带有 Cookie 的响应
      return response
    }
  }

  // 验证失败，跳回登录页
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}