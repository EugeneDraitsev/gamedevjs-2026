import { goto } from "$app/navigation";

type GotoOptions = Parameters<typeof goto>[1];
type RouteTarget = URL | string;

const itchStaticBuild = import.meta.env.VITE_ITCH_BUILD === "1";
const protocolPattern = /^[a-z][a-z\d+.-]*:/i;

const getHashSearchParams = (hash: string) => {
  const queryStart = hash.indexOf("?");

  if (queryStart === -1) {
    return new URLSearchParams();
  }

  const fragmentStart = hash.indexOf("#", queryStart + 1);
  const query =
    fragmentStart === -1
      ? hash.slice(queryStart + 1)
      : hash.slice(queryStart + 1, fragmentStart);

  return new URLSearchParams(query);
};

const setHashSearchParam = (
  hash: string,
  key: string,
  value: string | null
) => {
  const prefix = hash.startsWith("#") ? "#" : "";
  const route = prefix ? hash.slice(1) : hash;
  const queryStart = route.indexOf("?");
  const fragmentStart = route.indexOf("#");
  let pathEnd = route.length;

  if (queryStart !== -1) {
    pathEnd = queryStart;
  } else if (fragmentStart !== -1) {
    pathEnd = fragmentStart;
  }

  const queryEnd = fragmentStart === -1 ? route.length : fragmentStart;
  const path = route.slice(0, pathEnd);
  const query = queryStart === -1 ? "" : route.slice(queryStart + 1, queryEnd);
  const fragment = fragmentStart === -1 ? "" : route.slice(fragmentStart);
  const params = new URLSearchParams(query);

  if (value === null) {
    params.delete(key);
  } else {
    params.set(key, value);
  }

  const nextQuery = params.toString();

  return `${prefix}${path}${nextQuery ? `?${nextQuery}` : ""}${fragment}`;
};

const withSearch = (path: string, search: string) => {
  if (!search) {
    return path;
  }

  const [route, fragment = ""] = path.split("#", 2);
  const separator = route.includes("?") ? "&" : "?";

  return `${route}${separator}${search.slice(1)}${fragment ? `#${fragment}` : ""}`;
};

const routePathFromTarget = (target: RouteTarget) => {
  if (target instanceof URL) {
    if (itchStaticBuild && target.hash.startsWith("#/")) {
      return withSearch(target.hash.slice(1), target.search);
    }

    return `${target.pathname}${target.search}${target.hash}`;
  }

  return target;
};

export const toAppRouteTarget = (target: RouteTarget): RouteTarget => {
  if (!itchStaticBuild) {
    return target;
  }

  const path = routePathFromTarget(target);

  if (path.startsWith("#") || protocolPattern.test(path)) {
    return path;
  }

  return `#${path.startsWith("/") ? path : `/${path}`}`;
};

export const gotoAppRoute = (target: RouteTarget, options?: GotoOptions) =>
  goto(toAppRouteTarget(target), options);

export const getAppSearchParam = (url: URL, key: string) => {
  const searchValue = url.searchParams.get(key);

  if (searchValue !== null) {
    return searchValue;
  }

  return getHashSearchParams(url.hash).get(key);
};

export const getCurrentAppSearchParam = (url: URL, key: string) => {
  const urlValue = getAppSearchParam(url, key);

  if (urlValue !== null || typeof window === "undefined") {
    return urlValue;
  }

  return getHashSearchParams(window.location.hash).get(key);
};

export const setAppSearchParam = (
  url: URL,
  key: string,
  value: string | null
) => {
  const nextUrl = new URL(url);
  const hashRoute =
    nextUrl.hash.startsWith("#/") ||
    (typeof window !== "undefined" && window.location.hash.startsWith("#/"));

  if (itchStaticBuild && hashRoute) {
    const hash = nextUrl.hash.startsWith("#/")
      ? nextUrl.hash
      : window.location.hash;

    nextUrl.hash = setHashSearchParam(hash, key, value);
    nextUrl.searchParams.delete(key);

    return nextUrl;
  }

  if (value === null) {
    nextUrl.searchParams.delete(key);
  } else {
    nextUrl.searchParams.set(key, value);
  }

  return nextUrl;
};
