// Choose the dashboard from the role established by the authenticated API user.
export function dashboardPath(role) {
  if (role === "ADMIN") return "/admin";
  if (role === "CITIZEN") return "/dashboard";
  return "/login";
}

// Only restore a local citizen report form; never trust a caller-supplied URL.
export function postLoginPath(role, returnTo) {
  if (
    role === "CITIZEN" &&
    typeof returnTo === "string" &&
    /^\/requests\/new(?:\?.*)?$/.test(returnTo)
  ) {
    return returnTo;
  }
  return dashboardPath(role);
}
