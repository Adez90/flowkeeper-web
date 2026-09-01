const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

/** The API's error responses are JSON ({message, status, timestamp}) — extract just the message rather than surfacing the raw body to the user. */
async function parseErrorMessage(res: Response): Promise<string> {
	const body = await res.text();
	if (!body) return res.statusText;
	try {
		const parsed: unknown = JSON.parse(body);
		if (parsed && typeof parsed === "object" && typeof (parsed as { message?: unknown }).message === "string") {
			return (parsed as { message: string }).message;
		}
	} catch {
		// Not JSON (e.g. a plain-text error page from something in front of the API) — fall through to the raw body.
	}
	return body;
}

interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
	token?: string;
	headers?: Record<string, string>;
}

async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
	const { token, headers, ...rest } = options;
	return fetch(`${API_BASE_URL}${path}`, {
		...rest,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...headers,
		},
	});
}

export async function apiFetchJson<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
	const res = await apiFetch(path, options);
	if (!res.ok) {
		throw new ApiError(res.status, await parseErrorMessage(res));
	}
	const text = await res.text();
	return text ? (JSON.parse(text) as T) : (undefined as T);
}

/** For multipart uploads — the browser must set Content-Type itself (with the multipart boundary), so this can't go through apiFetch's fixed "application/json" header. */
export async function apiUploadFile<T>(path: string, token: string, file: File): Promise<T> {
	const formData = new FormData();
	formData.append("file", file);
	const res = await fetch(`${API_BASE_URL}${path}`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: formData,
	});
	if (!res.ok) {
		throw new ApiError(res.status, await parseErrorMessage(res));
	}
	return (await res.json()) as T;
}
