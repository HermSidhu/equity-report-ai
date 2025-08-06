import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 300000, // 5 minutes for long operations
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use((config) => {
  console.log(`📡 ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(
      `✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${
        response.status
      }`
    );
    return response;
  },
  (error) => {
    console.error(
      `❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${
        error.response?.status
      }`,
      error
    );
    return Promise.reject(error);
  }
);

// API Endpoints
export const apiEndpoints = {
  // Annual Reports
  downloadReports: (companyName: string, irUrl: string) =>
    api.post("/annual_reports", { companyName, irUrl }),

  // Parsing
  parseReports: (company: string) => api.post("/parse", { company }),

  getParseStatus: () => api.get("/parse/status"),

  getCompanies: () => api.get("/parse/companies"),

  // CSV Export
  getAvailableCompaniesForCSV: () => api.get("/csv/companies"),

  downloadCSV: (company: string) =>
    api.get(`/csv/download/${company}`, { responseType: "blob" }),

  previewCSV: (company: string, limit = 50) =>
    api.get(`/csv/preview/${company}?limit=${limit}`),

  compareCSV: (companies: string[]) =>
    api.post("/csv/compare", { companies }, { responseType: "blob" }),
};

// Helper function for CSV download
export const downloadCSVFile = async (company: string, filename?: string) => {
  try {
    const response = await apiEndpoints.downloadCSV(company);
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `${company}_financial_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("CSV download failed:", error);
    throw error;
  }
};

// Helper function for comparative CSV download
export const downloadComparativeCSV = async (
  companies: string[],
  filename?: string
) => {
  try {
    const response = await apiEndpoints.compareCSV(companies);
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      filename || `financial_comparison_${companies.join("_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Comparative CSV download failed:", error);
    throw error;
  }
};

export default api;
