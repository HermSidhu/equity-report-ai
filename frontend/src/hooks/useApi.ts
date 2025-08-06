import { useQuery, useMutation } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import api from "@/utils/api";
import { COMPANIES } from "../../companies";
import { Company, ConsolidatedData, APIResponse } from "@/types";

// Company queries
export const useCompanies = () => {
  return useQuery<APIResponse<Company[]>>({
    queryKey: ["companies"],
    queryFn: async () => {
      // Return hardcoded companies
      return {
        success: true,
        data: COMPANIES,
        count: COMPANIES.length,
      };
    },
  });
};

export const useCompany = (code: string) => {
  return useQuery<APIResponse<Company>>({
    queryKey: ["company", code],
    queryFn: async () => {
      const company = COMPANIES.find((c) => c.id === code);
      if (!company) {
        throw new Error("Company not found");
      }
      return {
        success: true,
        data: company,
      };
    },
    enabled: !!code,
  });
};

// Annual Reports Download
export const useDownloadAnnualReports = () => {
  return useMutation({
    mutationFn: async (company: Company) => {
      const response = await api.post("/annual_reports", {
        companyName: company.id,
        irUrl: company.irUrl,
      });
      return response.data;
    },
    onSuccess: (_data, company) => {
      notifications.show({
        title: "Download Started",
        message: `Started downloading annual reports for ${company.name}`,
        color: "blue",
      });
    },
    onError: (error: any, company) => {
      notifications.show({
        title: "Download Failed",
        message:
          error.response?.data?.error ||
          `Failed to download reports for ${company.name}`,
        color: "red",
      });
    },
  });
};

// Parsing mutations
export const useParseCompany = () => {
  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await api.post("/parse", { company: companyId });
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

// Get available companies for CSV export
export const useAvailableCompanies = () => {
  return useQuery<{ companies: string[]; total: number }>({
    queryKey: ["csvCompanies"],
    queryFn: async () => {
      const response = await api.get("/csv/companies");
      return response.data;
    },
  });
};

// Get consolidated data (from compiled_data)
export const useConsolidatedData = (companyId: string, enabled = true) => {
  return useQuery<ConsolidatedData>({
    queryKey: ["consolidatedData", companyId],
    queryFn: async () => {
      const response = await api.get(`/compiled_data/${companyId}`);
      const compiledData = response.data.data;

      // Convert compiled JSON to our ConsolidatedData format
      const consolidated: ConsolidatedData = {
        incomeStatement: {},
        balanceSheet: {},
        cashFlow: {},
        years: [],
      };

      if (compiledData && compiledData.statements) {
        // Get years from metadata or extract from statements
        consolidated.years =
          compiledData.metadata?.years_covered?.map((y: string) =>
            parseInt(y)
          ) || [];

        // Transform income statement from year-first to metric-first structure
        if (compiledData.statements.income_statement) {
          const incomeByYear = compiledData.statements.income_statement;
          for (const year in incomeByYear) {
            const yearData = incomeByYear[year];
            for (const metric in yearData) {
              if (!consolidated.incomeStatement[metric]) {
                consolidated.incomeStatement[metric] = {};
              }
              consolidated.incomeStatement[metric][year] = yearData[metric];
            }
          }
        }

        // Transform balance sheet from year-first to metric-first structure
        if (compiledData.statements.balance_sheet) {
          const balanceByYear = compiledData.statements.balance_sheet;
          for (const year in balanceByYear) {
            const yearData = balanceByYear[year];
            for (const metric in yearData) {
              if (!consolidated.balanceSheet[metric]) {
                consolidated.balanceSheet[metric] = {};
              }
              consolidated.balanceSheet[metric][year] = yearData[metric];
            }
          }
        }

        // Transform cash flow from year-first to metric-first structure
        if (compiledData.statements.cash_flow) {
          const cashFlowByYear = compiledData.statements.cash_flow;
          for (const year in cashFlowByYear) {
            const yearData = cashFlowByYear[year];
            for (const metric in yearData) {
              if (!consolidated.cashFlow[metric]) {
                consolidated.cashFlow[metric] = {};
              }
              consolidated.cashFlow[metric][year] = yearData[metric];
            }
          }
        }
      }

      return consolidated;
    },
    enabled: enabled && !!companyId,
  });
};

// CSV Download
export const useDownloadCSV = () => {
  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await api.get(`/csv/download/${companyId}`, {
        responseType: "blob",
      });

      // Create download
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${companyId}_financial_data.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "Download Started",
        message: "Your CSV file download has begun",
        color: "green",
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: "Download Failed",
        message: error.response?.data?.error || "Failed to download CSV file",
        color: "red",
      });
    },
  });
};
