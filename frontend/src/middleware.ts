import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Đọc Token và Role từ Cookies
  const adminToken = request.cookies.get('HDG_token_admin')?.value
  const userToken  = request.cookies.get('HDG_token_user')?.value
  const role       = request.cookies.get('HDG_role')?.value

  // NHIỆM VỤ 2: BẢO VỆ ROUTE (MIDDLEWARE)

  // 1. Phân luồng cho khu vực quản trị (ADMIN)
  if (pathname.startsWith('/admin')) {
    // Nếu vào trang login admin mà đã có tư cách admin -> đẩy vào Dashboard
    if (pathname === '/admin/login') {
       if (adminToken && role === 'admin') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url))
       }
       return NextResponse.next()
    }

    // Nếu cố vào các trang quản trị sâu hơn mà không phải Admin -> đá về trang login admin
    if (!adminToken || role !== 'admin') {
       return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // 2. Không chặn /login và /register khi đã có token — cho phép mở form (đổi tài khoản, xử lý cookie cũ).
  // Trước đây redirect về / gây "tự động nhảy" khỏi trang đăng nhập/đăng ký.

  // 3. Bảo vệ các trang cần đăng nhập mới xem được (Ví dụ: /profile)
  if (pathname.startsWith('/profile')) {
     if (!userToken && !adminToken) {
        return NextResponse.redirect(new URL('/login', request.url))
     }
  }

  return NextResponse.next()
}

// Chỉ áp dụng middleware cho các đường dẫn cụ thể
export const config = {
  // `/profile` riêng: một số phiên bản Next không khớp `/profile/:path*` với URL đúng `/profile`.
  matcher: ['/admin/:path*', '/profile', '/profile/:path*', '/login', '/register'],
}
