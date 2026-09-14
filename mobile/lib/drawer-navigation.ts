export type DrawerRoute =
  | "/dashboard"
  | "/assistant"
  | "/projects"
  | "/productivity"
  | "/studies"
  | "/journeys"
  | "/challenges"
  | "/arena"
  | "/passport"
  | "/creator"
  | "/community"
  | "/premium"
  | "/settings";

/** Matches a module route without accidentally selecting similarly prefixed routes. */
export function isDrawerRouteSelected(pathname: string, route: DrawerRoute) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return normalized === route || normalized.startsWith(`${route}/`);
}
