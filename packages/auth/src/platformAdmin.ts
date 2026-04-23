function parsePlatformAdminEmails() {
  return (process.env.AUTH_PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return parsePlatformAdminEmails().includes(email.trim().toLowerCase());
}
