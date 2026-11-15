const API_BASE_URL = process.env.REACT_APP_UPI_API_BASE_URL || "http://localhost:5001";

export const registrationAccessKey = (paymentGroupId) => `upi-access-${paymentGroupId}`;

export const saveRegistrationAccess = (paymentGroupId, accessToken) => {
  sessionStorage.setItem(registrationAccessKey(paymentGroupId), accessToken);
};

export const getRegistrationAccess = (paymentGroupId) =>
  sessionStorage.getItem(registrationAccessKey(paymentGroupId));

export const upiApiRequest = async (path, { accessToken, ...options } = {}) => {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || `UPI service request failed (${response.status}).`);
  }
  return result;
};

export const upiApiBaseUrl = API_BASE_URL;
