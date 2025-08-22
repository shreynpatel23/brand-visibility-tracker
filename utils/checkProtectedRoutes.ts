export function isRouteProtected(url: string) {
  if (url.includes("/api/users")) {
    return true;
  }
  if (url.includes("/api/plans")) {
    return true;
  }
  return false;
}
