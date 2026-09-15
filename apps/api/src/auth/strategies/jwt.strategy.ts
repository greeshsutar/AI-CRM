import {
  Injectable,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
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

interface JwtHeader {
  alg?: string;
  kid?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @Optional() private readonly authService?: AuthService,
  ) {
    const supabaseJwtSecret = configService.get<string>(
      'SUPABASE_JWT_SECRET',
    );

    const supabaseUrl = configService.get<string>(
      'app.supabaseUrl',
      'https://nbtcahwwwvttrgrmeiac.supabase.co',
    );

    const jwksUri =
      `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;

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
        try {
          /*
           * The JWT header is NOT trusted for authentication.
           * It is only used to determine which verification-key
           * mechanism should be used.
           *
           * passport-jwt will still perform the actual signature
           * verification afterwards.
           */
          const parts = rawJwtToken.split('.');

          if (parts.length !== 3) {
            return done(new UnauthorizedException('Malformed JWT'));
          }

          const encodedHeader = parts[0];

          const decodedHeader = Buffer.from(
            encodedHeader,
            'base64url',
          ).toString('utf8');

          const header = JSON.parse(decodedHeader) as JwtHeader;

          const algorithm = header.alg;
          const keyId = header.kid;

          /*
           * Supabase asymmetric JWTs:
           *
           * ES256 / RS256
           * OR
           * tokens containing a kid
           *
           * must be verified using the Supabase JWKS public key.
           */
          if (
            algorithm === 'ES256' ||
            algorithm === 'RS256' ||
            Boolean(keyId)
          ) {
            return jwksSecret(request, rawJwtToken, done);
          }

          /*
           * Legacy / symmetric Supabase JWT.
           *
           * Only HS256 may use SUPABASE_JWT_SECRET.
           */
          if (algorithm === 'HS256') {
            if (!supabaseJwtSecret) {
              return done(
                new UnauthorizedException(
                  'SUPABASE_JWT_SECRET is required for HS256 tokens',
                ),
              );
            }

            return done(null, supabaseJwtSecret);
          }

          return done(
            new UnauthorizedException(
              `Unsupported JWT algorithm: ${algorithm ?? 'missing'}`,
            ),
          );
        } catch {
          return done(
            new UnauthorizedException('Invalid JWT header'),
          );
        }
      },
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException(
        'Invalid token payload: missing sub claim',
      );
    }

    if (!payload.email) {
      throw new UnauthorizedException(
        'Invalid token payload: missing email claim',
      );
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