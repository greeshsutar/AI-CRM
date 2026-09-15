import { Injectable, UnauthorizedException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  aud?: string;
  role?: string;
  exp?: number;
  iat?: number;
  aal?: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  aal?: 'aal1' | 'aal2';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @Optional() private readonly authService?: AuthService,
  ) {
    const supabaseJwtSecret = configService.get<string>('SUPABASE_JWT_SECRET');
    const supabaseUrl = configService.get<string>(
      'app.supabaseUrl',
      'https://nbtcahwwwvttrgrmeiac.supabase.co',
    );

    const jwksUri = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
    const jwksSecret = passportJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri,
    });

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256', 'ES256', 'RS256'],
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        if (supabaseJwtSecret) {
          return done(null, supabaseJwtSecret);
        }
        return jwksSecret(request, rawJwtToken, done);
      },
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload: missing sub claim');
    }

    if (this.authService) {
      return this.authService.validateUserPayload(payload);
    }

    return {
      userId: payload.sub,
      email: payload.email,
      aal: payload.aal === 'aal2' ? 'aal2' : 'aal1',
    };
  }
}

