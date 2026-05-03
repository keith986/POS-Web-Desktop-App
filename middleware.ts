import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const baseDomain = 'upendoapps.com'
  const mainApp = 'pos.upendoapps.com'

  // Main app — pass through
  if (hostname === mainApp || hostname === `www.${mainApp}`) {
    return NextResponse.next()
  }

  // Extract subdomain
  const subdomain = hostname.replace(`.${baseDomain}`, '')

  const pathname = request.nextUrl.pathname

  // Skip non-tenant hostnames
  if (
    hostname === baseDomain ||
    hostname === `www.${baseDomain}` ||
    subdomain === hostname ||
    subdomain === '' ||
    subdomain === 'www' ||
    subdomain === 'pos' ||
    subdomain === 'ovpn' ||
    pathname.startsWith('/super-admin') 
  ) {
    return NextResponse.next()
  }

  // Rewrite root to tenant page
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = `/${subdomain}`
    return NextResponse.rewrite(url)
  }

  // Pass through with tenant header
  const response = NextResponse.next()
  response.headers.set('x-tenant', subdomain)
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}