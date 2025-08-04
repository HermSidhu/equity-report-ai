import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import api from "@/utils/api";
import {
  Company,
  ScrapingProgress,
  ConsolidatedData,
  APIResponse,
} from "@/types";

// Company queries
export const useCompanies = () => {
  return useQuery<APIResponse<Company[]>>({
    queryKey: ["companies"],
    queryFn: async () => {
      const response = await api.get("/companies");
      return response.data;
    },
  });
};

export const useCompany = (id: string) => {
  return useQuery<APIResponse<Company>>({
    queryKey: ["company", id],
    queryFn: async () => {
      const response = await api.get(`/companies/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Scraping mutations and queries
export const useScrapeCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await api.post("/scrape", { companyId });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "Scraping Started",
        message: "Annual report scraping has been initiated",
        color: "blue",
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: "Scraping Failed",
        message: error.response?.data?.error || "Failed to start scraping",
        color: "red",
      });
    },
  });
};

export const useScrapeStatus = (companyId: string, enabled = false) => {
  return useQuery<APIResponse<ScrapingProgress>>({
    queryKey: ["scrapeStatus", companyId],
    queryFn: async () => {
      try {
        const response = await api.get(`/scrape/status/${companyId}`);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Return default idle state if no status exists yet
          return {
            success: true,
            data: {
              stage: "idle" as const,
              progress: 0,
              message: "Ready to start scraping",
            },
          };
        }
        throw error;
      }
    },
    enabled,
    refetchInterval: enabled ? 1000 : false, // Poll every second when enabled
    refetchIntervalInBackground: false,
  });
};

// Parsing mutations and queries
export const useParseCompany = () => {
  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await api.post("/parse", { companyId });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "Parsing Started",
        message: "PDF parsing has been initiated",
        color: "blue",
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: "Parsing Failed",
        message: error.response?.data?.error || "Failed to start parsing",
        color: "red",
      });
    },
  });
};

export const useParseStatus = (companyId: string, enabled = false) => {
  return useQuery<APIResponse<ScrapingProgress>>({
    queryKey: ["parseStatus", companyId],
    queryFn: async () => {
      const response = await api.get(`/parse/status/${companyId}`);
      return response.data;
    },
    enabled: enabled && !!companyId,
    refetchInterval: (query) => {
      const stage = query.state.data?.data?.stage;
      return stage === "parsing" ? 2000 : false;
    },
  });
};

// Aggregation queries
export const useConsolidatedData = (companyId: string, enabled = false) => {
  return useQuery<APIResponse<ConsolidatedData>>({
    queryKey: ["consolidatedData", companyId],
    queryFn: async () => {
      const response = await api.get(`/aggregate/${companyId}`);
      return response.data;
    },
    enabled: enabled && !!companyId,
  });
};

export const useAggregateCompany = () => {
  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await api.post("/aggregate", { companyId });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "Aggregation Complete",
        message: "Financial data has been consolidated successfully",
        color: "green",
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: "Aggregation Failed",
        message: error.response?.data?.error || "Failed to aggregate data",
        color: "red",
      });
    },
  });
};

// Download mutations
export const useDownloadData = () => {
  return useMutation({
    mutationFn: async ({
      companyId,
      format,
    }: {
      companyId: string;
      format: "csv" | "excel";
    }) => {
      const response = await api.get(
        `/aggregate/${companyId}/download?format=${format}`,
        {
          responseType: "blob",
        }
      );

      // Create download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${companyId}-financial-statements.${
        format === "excel" ? "xlsx" : "csv"
      }`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "Download Started",
        message: "Your file download has begun",
        color: "green",
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: "Download Failed",
        message: error.response?.data?.error || "Failed to download file",
        color: "red",
      });
    },
  });
};
