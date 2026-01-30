export const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("token");
    window.location.reload(); // force login
    return;
  }

  return res;
};