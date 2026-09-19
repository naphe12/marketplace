const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000/api/v1";

type ApiOptions = RequestInit & {
  authenticated?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const {
    authenticated = false,
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

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...requestOptions,
      headers: requestHeaders,
    },
  );

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

  return response.json();
}