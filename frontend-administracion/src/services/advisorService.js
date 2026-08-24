import { apiClient } from "@/services/apiClient";

const json = (method, body) => ({ method, body: JSON.stringify(body) });
const base = "/api/users/advisors";

export const advisorService = {
  list: () => apiClient(base),
  create: (values) => apiClient(base, json("POST", values)),
  setStatus: (id, status) =>
    apiClient(`${base}/${id}/status`, json("PATCH", { status })),
  update: (id, values) =>
    apiClient(`${base}/${id}`, json("PUT", values)),
  workspace: (advisorId = "") =>
    apiClient(`${base}/workspace/current${advisorId ? `?advisorId=${encodeURIComponent(advisorId)}` : ""}`),
  createGroup: (values) =>
    apiClient(`${base}/groups`, json("POST", values)),
  createUser: (values) =>
    apiClient(`${base}/users`, json("POST", values)),
  updateUser: (id, values) =>
    apiClient(`${base}/users/${id}`, json("PUT", values)),
  setUserStatus: (id, status, advisorId = "") =>
    apiClient(
      `${base}/users/${id}/status`,
      json("PATCH", { status, advisorId: advisorId || undefined }),
    ),
};
