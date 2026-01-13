import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 这是一个服务端的路由处理程序，专门处理邮箱链接中的 ?code=xxx
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // 如果链接里有 code，我们需要用它换取 session
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 登录成功！跳转回首页
      // 如果您希望登录后跳转到其他页面，可以修改这里的 URL
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // 如果出错，跳转回登录页并提示
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}