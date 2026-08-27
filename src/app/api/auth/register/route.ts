import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth-node';
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

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const lowerUsername = trimmedUsername.toLowerCase();

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE LOWER(username) = ${lowerUsername}
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    // Insert user
    const result = await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${trimmedUsername}, ${passwordHash})
      RETURNING id, username
    `;

    const newUser = result[0];

    // Sign the JWT
    const token = await signToken({ id: newUser.id, username: newUser.username });

    const response = NextResponse.json({ success: true, username: newUser.username });

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
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
