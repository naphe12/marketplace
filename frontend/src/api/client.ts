export const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000/api/v1";

import {
  enqueueAction,
  getCache,
  putCache,
} from "../offline/db";

import {
  syncQueuedActions,
} from "../offline/sync";

type ApiOptions = RequestInit & {
  authenticated?: boolean;
  offlineQueue?: boolean;
  cacheKey?: string;
};

export class QueuedActionError extends Error {
  queuedId: string;

  constructor(queuedId: string) {
    super("Action enregistrée localement. Elle sera envoyée quand la connexion reviendra.");
    this.name = "QueuedActionError";
    this.queuedId = queuedId;
  }
}

function isRead(method?: string) {
  return !method || method.toUpperCase() === "GET";
}

function shouldQueue(error: unknown) {
  return error instanceof TypeError || !navigator.onLine;
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const {
    authenticated = false,
    offlineQueue = false,
    cacheKey = path,
    headers,
    ...requestOptions
  } = options;

  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Content-Type")) {
    requestHeaders.set(
      "Content-Type",
      "application/json",
    );
  }

  if (authenticated) {
    const token =
      localStorage.getItem("access_token");

    if (token) {
      requestHeaders.set(
        "Authorization",
        `Bearer ${token}`,
      );
    }
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_URL}${path}`,
      {
        ...requestOptions,
        headers: requestHeaders,
      },
    );
  } catch (cause) {
    if (isRead(requestOptions.method)) {
      const cached = await getCache<T>(cacheKey);
      if (cached) {
        return cached.value;
      }
    }

    if (offlineQueue && !isRead(requestOptions.method) && shouldQueue(cause)) {
      const queued = await enqueueAction({
        path,
        method: requestOptions.method?.toUpperCase() ?? "GET",
        headers: Array.from(requestHeaders.entries())
          .filter(([key]) => key.toLowerCase() !== "authorization"),
        body: typeof requestOptions.body === "string" ? requestOptions.body : null,
        authenticated,
      });

      window.dispatchEvent(new CustomEvent("offline-action-queued", { detail: queued }));
      throw new QueuedActionError(queued.id);
    }

    throw cause;
  }

  if (!response.ok) {
    let message = `Une erreur est survenue (HTTP ${response.status}).`;

    try {
      const data = await response.json();

      const detail: unknown = data.detail ?? data.message;
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        const errors = detail.flatMap((item: unknown) => {
          if (!item || typeof item !== "object" || !("msg" in item)
              || typeof item.msg !== "string") return [];
          const field = "loc" in item && Array.isArray(item.loc)
            ? item.loc.filter(part => part !== "body").join(".")
            : "";
          return [field ? `${field} : ${item.msg}` : item.msg];
        });
        if (errors.length) message = errors.join(" ; ");
      }
    } catch {
      // réponse non JSON
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json() as T;

  if (isRead(requestOptions.method)) {
    void putCache(cacheKey, data);
  } else {
    void syncQueuedActions();
  }

  return data;
}

export async function downloadApiFile(
  path: string,
  filename: string,
) {
  const token = localStorage.getItem("access_token");
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { headers });

  if (!response.ok) {
    throw new Error(`Export impossible (HTTP ${response.status}).`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
