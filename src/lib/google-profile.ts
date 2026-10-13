type GoogleProfileClaims = {
  sub?: string | null;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  email_verified?: boolean | null;
  role?: unknown;
};

type GoogleUserSeed = {
  id: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: Date | null;
};

export function googleUserSeed(
  profile: GoogleProfileClaims & { sub: string },
): GoogleUserSeed & { id: string };
export function googleUserSeed(profile: GoogleProfileClaims): GoogleUserSeed;
export function googleUserSeed(profile: GoogleProfileClaims): GoogleUserSeed {
  return {
    id: profile.sub ?? null,
    name: profile.name ?? null,
    email: profile.email ?? null,
    image: profile.picture ?? null,
    emailVerified: profile.email_verified === true ? new Date() : null,
  };
}
