import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword } from '@/lib/auth-node';
import { signToken } from '@/lib/auth-jwt';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Missing username or password' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();

    // Query database for the user
    const users = await sql`
      SELECT * FROM users WHERE LOWER(username) = ${trimmedUsername}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const user = users[0];
    const isPasswordCorrect = verifyPassword(password, user.password_hash);

    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Sign the JWT
    const token = await signToken({ id: user.id, username: user.username });

    const response = NextResponse.json({ success: true, username: user.username });

    // Set cookie
    response.cookies.set('foosball_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
