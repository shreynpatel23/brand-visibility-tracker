export function isRouteProtected(url: string) {
  if (url.includes("/api/users")) {
    return true;
  }
  if (url.includes("/api/brand")) {
    return true;
  }
  if (url.includes("/api/analysis")) {
    return true;
  }
  if (url.includes("/api/dashboard")) {
    return true;
  }
  if (url.includes("/api/matrix")) {
    return true;
  }
  if (url.includes("/api/logs")) {
    return true;
  }
  if (url.includes("/api/transactions")) {
    return true;
  }
  if (url.includes("/api/credit-transactions")) {
    return true;
  }
  return false;
}
